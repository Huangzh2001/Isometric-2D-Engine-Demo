// PXM-07.18O5: add safe content-set fallback for order-churn stable item-plan misses.
// Layer: presentation/render/optimization.
//
// This is the formal static-world migration path. It does NOT consume
// Canvas2D raster/bitmap run output. PixiJS consumes the renderer-neutral
// optimization products produced by renderer-neutral source modules:
// framePlan.order, static-world-face-packet payloads, projected geometry cache,
// material colors, terrain boundary segments, and shadow overlay projection
// payloads. Canvas2D may be skipped only after the whole static-world-face-packet
// category is accepted and drawn by this consumer for the current frame.
(function registerSharedRenderOptimizationPixiStaticWorldPacketConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js';
  var STEP = 'PXM-07.18O6A-RTDIAG';
  var PHASE = 'rendertexture-churn-diagnostics-only';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    frameSeq: 0,
    graphicsPool: [],
    chunkSpritePool: [],
    chunkRenderTextureCache: Object.create(null),
    activeFramePlanId: '',
    activeRunKeys: Object.create(null),
    activeCategoryAdopted: false,
    lastSummary: null,
    totalPacketDrawCount: 0,
    totalFrameAdoptionCount: 0,
    totalRejectedFrameCount: 0,
    lastAssetClassificationSignature: '',
    lastAssetClassificationEmitAt: 0,
    lastAssetClassificationSummary: null,
    lastOrderRunCacheDiagnosticsSignature: '',
    lastOrderRunCacheDiagnosticsEmitAt: 0,
    lastOrderRunCacheDiagnosticsSummary: null,
    lastOrderRunCacheEvidenceSignature: '',
    lastOrderRunCacheEvidenceEmitAt: 0,
    lastOrderRunCacheEvidenceSummary: null,
    // PXM-07.18E: cache the camera-independent static packet scheduling base.
    // The per-frame item still receives the current framePlan orderIndex, but
    // projected geometry, chunk texture signature, and chunk drawData are reused
    // until the static/projection/cache-space key changes.
    staticPacketItemBaseCache: Object.create(null),
    staticPacketItemBaseCacheSeq: 0,
    // PXM-07.18E: cache the order-run grouping plan for the active
    // player-sensitive chunk. Textures were already cached in 07.18C; this
    // prevents rebuilding the run plan when the static order signature is stable.
    orderRunPlanCache: Object.create(null),
    orderRunPlanCacheSeq: 0,
    // PXM-07.18F/07.18I: cache the stable split between external chunk-cache
    // packets and the active player-sensitive order-run packets. This was
    // measured as the remaining per-frame CPU cost after 07.18E.
    chunkEligibilitySplitCache: Object.create(null),
    chunkEligibilitySplitCacheSeq: 0,
    // PXM-07.18K0B: keep last beginFrame phase diagnostics so the outer
    // draw loop can report real failures instead of swallowing exceptions.
    lastBeginFramePhaseDiagnostics: null,
    lastBeginFrameExceptionDiagnostics: null,
    // PXM-07.18K0C: prune the large static item cache lazily.
    // K0B proved pruneStaticPacketItemBaseCache could spend ~1s per frame
    // when the visible active set was larger than the old 4096 default limit.
    lastStaticPacketItemBasePruneFrameSeq: 0,
    lastStaticPacketItemBasePruneResult: { removed: 0, size: 0, skipped: true, reason: 'not-run-yet', activeKeyCount: 0, cacheKeyCount: 0, limit: 0, effectiveLimit: 0 },
    // PXM-07.18L: one-line forensic summaries for the Pixi static-world path.
    // These are diagnostics only; they do not change rendering behavior.
    lastStaticWorldForensicsSignature: '',
    lastStaticWorldForensicsEmitAt: 0,
    // PXM-07.18N: cache only a stable item plan: packet refs + existing
    // staticPacketItemBaseCache keys + order metadata. It intentionally does
    // NOT cache projected geometry, drawData, renderTransform, sprite placement,
    // or materialized chunk item objects. This reuses the existing lower-level
    // staticPacketItemBaseCache instead of creating a parallel render cache.
    staticMaterializedPlanCache: Object.create(null),
    staticMaterializedPlanCacheSeq: 0,
    // PXM-07.18O5: exact ordered plan cache stays for O(1) fast-hit.
    // A second content-set cache is used only when the same static packet set
    // appears in a different frame-local order. It reuses existing baseCache
    // entries but refreshes current order metadata; it does not reuse old
    // item arrays, splits, sprites, transforms, or textures.
    staticMaterializedContentSetCache: Object.create(null),
    staticMaterializedContentSetCacheSeq: 0,
    // PXM-07.18O6A: first chunk-level stable plan cache.  This is a
    // conservative miss-path cache: global exact fast-hit remains the primary
    // path.  When the global frame-level plan misses, unchanged chunks can
    // reuse existing staticPacketItemBaseCache-derived item payloads while
    // changed chunks still fall back to the original per-packet build path.
    staticChunkItemPlanCache: Object.create(null),
    staticChunkItemPlanCacheSeq: 0,
    // PXM-07.18O6A-EVAL: rolling assessment only.  This writes the overall
    // performance verdict into the exported log before any next optimization
    // step is attempted.  It must not be used by rendering/cache decisions.
    staticWorldPerformanceAssessment: null,
    // PXM-07.18O4: diagnostics only. Track stable-plan cache keys so miss
    // frames can report which key fields changed without changing rendering.
    lastStaticMaterializedPlanCacheKey: '',
    lastStaticMaterializedPlanCacheKeyParts: null,
    lastStaticMaterializedPlanCacheHitKey: '',
    lastStaticMaterializedPlanCacheHitParts: null,
    lastStaticMaterializedPlanKeyDiffSummary: null,
    // PXM-07.18O5H: debug overlay only. Separate display objects, never
    // used by render decisions/cache keys/packet splitting.
    playerChunkDebugOverlayGraphics: null,
    playerChunkDebugOverlayTextPool: [],
    lastPlayerChunkDebugOverlaySignature: '',
    lastPlayerChunkDebugOverlayEmitAt: 0,
    // PXM-07.18O6A-RTDIAG: diagnostics only. Track why RenderTexture
    // cache entries miss/upload before changing any cache/render logic.
    lastRenderTextureChurnDiagnosticsSignature: '',
    lastRenderTextureChurnDiagnosticsEmitAt: 0
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }


  function isPixiPerformanceModeEnabled() {
    try {
      var mode = global.__PIXI_PERFORMANCE_LOG_MODE__ || null;
      if (mode && typeof mode.isEnabled === 'function') return mode.isEnabled() === true;
      if (global.__PIXI_PERFORMANCE_MODE__ === true) return true;
      if (global.localStorage) {
        var value = global.localStorage.getItem('pixiPerformanceMode');
        return value === '1' || value === 'true';
      }
    } catch (_) {}
    return false;
  }

  function shouldEmitDiagnosticsSection(section) {
    if (!isPixiPerformanceModeEnabled()) return true;
    section = String(section || '');
    return section === 'ready' || section === 'performance-hotspot' || section === 'fallback' || section === 'asset-classification' || section === 'order-run-cache-diagnostics' || section === 'order-run-cache-evidence' || section === 'begin-frame-phase-diagnostics' || section === 'begin-frame-exception' || section === 'optimization-placement-audit' || section === 'safe-input-plan-audit' || section === 'forensics-static-world' || section === 'static-world-performance-assessment' || section === 'rendertexture-churn-diagnostics' || section === 'forensics-cache' || section === 'forensics-hotspot' || section === 'forensics-transform' || section === 'player-chunk-debug-overlay';
  }

  function isVerboseStaticDiagnosticsEnabled() {
    try {
      if (global.__PIXI_STATIC_VERBOSE_DIAGNOSTICS__ === true) return true;
      if (global.localStorage && global.localStorage.getItem('pixiStaticVerboseDiagnostics') === '1') return true;
    } catch (_) {}
    return false;
  }

  function shouldCollectHeavyStaticDiagnostics() {
    return !isPixiPerformanceModeEnabled() || isVerboseStaticDiagnosticsEnabled();
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function emit(section, payload) {
    if (!shouldEmitDiagnosticsSection(section)) return '';
    var parts = [PREFIX + '[' + String(section || 'event') + ']'];
    payload = payload || {};
    try {
      Object.keys(payload).forEach(function (key) {
        var value = payload[key];
        if (value && typeof value === 'object') {
          try { value = JSON.stringify(value); } catch (_) { value = '[object]'; }
        }
        parts.push(String(key) + '=' + String(value));
      });
      var line = parts.join(' ');
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
  }

  function getActiveBackend() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      var snapshot = selection && typeof selection.getSnapshot === 'function' ? selection.getSnapshot() : null;
      if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    } catch (_) {}
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
    } catch (_) {}
    return 'unknown';
  }

  function getPixiWorldRenderer() {
    try { return global.__PIXI_MIGRATION_PIXI_WORLD_RENDERER__ || global.__PIXI_WORLD_RENDERER_SKELETON__ || null; } catch (_) {}
    return null;
  }

  function getPixiContainer() {
    try {
      var renderer = getPixiWorldRenderer();
      if (renderer && typeof renderer.getStaticWorldPacketContainer === 'function') return renderer.getStaticWorldPacketContainer('pixi-static-world-packet-consumer');
      if (renderer && typeof renderer.getStaticRunContainer === 'function') return renderer.getStaticRunContainer('pixi-static-world-packet-consumer');
    } catch (_) {}
    return null;
  }

  function getPixi() {
    try { return global.PIXI || null; } catch (_) {}
    return null;
  }

  function getProjectedGeometryApi() {
    try { return global.__STATIC_WORLD_PROJECTED_GEOMETRY_CACHE__ || null; } catch (_) {}
    return null;
  }

  function getStaticGpuChunkCacheInputApi() {
    try { return global.__STATIC_WORLD_GPU_CHUNK_CACHE_INPUT__ || null; } catch (_) {}
    return null;
  }

  function getCamera(deps) {
    try {
      if (deps && typeof deps.getCamera === 'function') return deps.getCamera() || {};
      if (deps && deps.camera) return deps.camera || {};
    } catch (_) {}
    return {};
  }

  function hasProjectionDependency(deps) {
    return !!(deps && typeof deps.screenPointsFromWorldFaceNoCamera === 'function');
  }

  function getPacketWorldPointCount(packet) {
    return Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0;
  }

  function getPacketWorldLoopCount(packet) {
    return Array.isArray(packet && packet.worldLoops) ? packet.worldLoops.length : 0;
  }

  function normalizeViewRotation(meta) {
    if (meta && meta.currentViewRotation != null) return toNumber(meta.currentViewRotation, 0);
    return 0;
  }

  function normalizeModulo4(value) {
    var n = toNumber(value, 0) % 4;
    if (n < 0) n += 4;
    return n;
  }

  function getStaticRotationSnapEpsilonForCache() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticRotationSnapEpsilon'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 0) n = 0.001;
    return Math.max(0, Math.min(0.05, n));
  }

  function resolveStaticPacketViewRotationForStaticCache(value, deps) {
    try {
      if (deps && typeof deps.resolveStaticPacketViewRotationForRender === 'function') {
        return normalizeModulo4(deps.resolveStaticPacketViewRotationForRender(value));
      }
    } catch (_) {}
    try {
      if (typeof global.resolveStaticPacketViewRotationForRender === 'function') {
        return normalizeModulo4(global.resolveStaticPacketViewRotationForRender(value));
      }
    } catch (_) {}
    var visual = normalizeModulo4(value);
    var snapped = Math.round(visual) % 4;
    if (snapped < 0) snapped += 4;
    var direct = Math.abs(visual - snapped);
    var wrapped = Math.min(direct, Math.abs(visual + 4 - snapped), Math.abs(visual - 4 - snapped));
    return wrapped <= getStaticRotationSnapEpsilonForCache() ? snapped : visual;
  }

  function getStaticRotationDiagnosticsForCache(value, deps) {
    var visual = normalizeModulo4(value);
    var resolved = resolveStaticPacketViewRotationForStaticCache(visual, deps);
    var nearest = Math.round(visual) % 4;
    if (nearest < 0) nearest += 4;
    var direct = Math.abs(visual - nearest);
    var wrapped = Math.min(direct, Math.abs(visual + 4 - nearest), Math.abs(visual - 4 - nearest));
    var epsilon = getStaticRotationSnapEpsilonForCache();
    var settled = wrapped <= epsilon;
    return {
      visualViewRotation: Number(visual.toFixed ? visual.toFixed(6) : visual),
      staticCacheViewRotation: Number(resolved.toFixed ? resolved.toFixed(6) : resolved),
      staticPacketViewRotation: Number(resolved.toFixed ? resolved.toFixed(6) : resolved),
      staticCacheViewRotationMode: settled ? 'settled-discrete-snap' : 'visual-interpolation',
      staticCacheViewRotationDelta: Number(wrapped.toFixed ? wrapped.toFixed(6) : wrapped),
      staticCacheRotationSnapEpsilon: Number(epsilon || 0),
      staticCacheRotationWasFractional: settled !== true,
      fractionalRotationInStaticCacheKey: settled !== true
    };
  }

  function sanitizeStaticTextureVersionRotation(version, staticRotation) {
    var raw = version == null ? '' : String(version);
    if (!raw) return '';
    var snapped = Number(staticRotation || 0);
    var out = raw;
    try {
      out = out.replace(/(\"viewRotation\"\s*:\s*)-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/ig, '$1' + String(snapped));
    } catch (_) { out = raw; }
    try {
      var parts = out.split('|');
      if (parts.length >= 6 && /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(parts[2])) {
        parts[2] = String(snapped);
        out = parts.join('|');
      }
    } catch (_) {}
    return out;
  }

  function getStaticSharedFrameTextureVersionForCache(staticRotation) {
    var shared = getSharedRenderFrameSnapshot();
    if (shared && shared.staticFloorTextureVersion) return String(shared.staticFloorTextureVersion || '');
    if (shared && shared.floorStaticTextureVersion) return String(shared.floorStaticTextureVersion || '');
    return sanitizeStaticTextureVersionRotation(shared && shared.floorTextureVersion ? shared.floorTextureVersion : '', staticRotation);
  }

  function getStaticFloorTextureVersionForCache(floorSnapshot, staticRotation) {
    if (floorSnapshot && floorSnapshot.staticTextureVersion) return String(floorSnapshot.staticTextureVersion || '');
    if (floorSnapshot && floorSnapshot.floorStaticTextureVersion) return String(floorSnapshot.floorStaticTextureVersion || '');
    return sanitizeStaticTextureVersionRotation(floorSnapshot && (floorSnapshot.textureVersion || floorSnapshot.version) || '', staticRotation);
  }

  function makeRunKey(framePlanId, runStartIndex) {
    return String(framePlanId || 'frameplan:none') + '|static-run|' + String(toNumber(runStartIndex, -1));
  }

  function clearActiveRunKeys() {
    state.activeRunKeys = Object.create(null);
  }

  function setContainerVisible(container, visible) {
    try { if (container) container.visible = visible === true; } catch (_) {}
  }

  function clearGraphics(graphics) {
    if (!graphics) return;
    try { if (typeof graphics.clear === 'function') graphics.clear(); } catch (_) {}
    try { graphics.visible = false; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketRenderSignature = ''; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketDrawOk = false; } catch (_) {}
    try { graphics.__pixiStaticWorldPacketDrawStats = null; } catch (_) {}
  }

  function clearUnusedGraphics(usedCount) {
    for (var i = Math.max(0, usedCount || 0); i < state.graphicsPool.length; i += 1) clearGraphics(state.graphicsPool[i]);
  }

  function getGraphics(index, container, shouldClear) {
    var Pixi = getPixi();
    var Graphics = Pixi && Pixi.Graphics;
    if (typeof Graphics !== 'function' || !container) return null;
    var g = state.graphicsPool[index] || null;
    if (!g) {
      try {
        g = new Graphics();
        g.label = 'pixi-static-world-face-packet-' + String(index);
        try { g.eventMode = 'none'; } catch (_) {}
        state.graphicsPool[index] = g;
        if (typeof container.addChild === 'function') container.addChild(g);
      } catch (_) {
        return null;
      }
    } else {
      try {
        if (g.parent !== container && typeof container.addChild === 'function') container.addChild(g);
      } catch (_) {}
    }
    if (shouldClear === true) clearGraphics(g);
    try { g.visible = true; } catch (_) {}
    return g;
  }

  function parseCssColor(value, fallbackColor, fallbackAlpha) {
    var str = String(value || '').trim();
    var alpha = fallbackAlpha == null ? 1 : Number(fallbackAlpha);
    if (!Number.isFinite(alpha)) alpha = 1;
    if (!str) return { color: fallbackColor == null ? 0xffffff : fallbackColor, alpha: alpha };
    var hex3 = /^#([0-9a-f]{3})$/i.exec(str);
    if (hex3) {
      return {
        color: parseInt(hex3[1].split('').map(function (ch) { return ch + ch; }).join(''), 16),
        alpha: alpha
      };
    }
    var hex6 = /^#([0-9a-f]{6})$/i.exec(str);
    if (hex6) return { color: parseInt(hex6[1], 16), alpha: alpha };
    var rgb = /^rgba?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(str);
    if (rgb) {
      var r = Math.max(0, Math.min(255, Math.round(toNumber(rgb[1], 0))));
      var g = Math.max(0, Math.min(255, Math.round(toNumber(rgb[2], 0))));
      var b = Math.max(0, Math.min(255, Math.round(toNumber(rgb[3], 0))));
      var a = rgb[4] == null ? alpha : Math.max(0, Math.min(1, toNumber(rgb[4], alpha)));
      return { color: (r << 16) + (g << 8) + b, alpha: a };
    }
    // PixiJS v8 can handle CSS colors in some APIs, but this consumer keeps a
    // deterministic numeric fallback for renderer-neutral packet colors.
    return { color: fallbackColor == null ? 0xffffff : fallbackColor, alpha: alpha };
  }

  function addCameraPoint(pt, camera) {
    return { x: toNumber(pt && pt.x, 0) + toNumber(camera && camera.x, 0), y: toNumber(pt && pt.y, 0) + toNumber(camera && camera.y, 0) };
  }

  function buildSharedFloorReuseRenderTransform(deps) {
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var pixi = transform && transform.pixi || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var scale = toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1));
    if (!Number.isFinite(scale) || Math.abs(scale) < 0.0001) scale = 1;
    var shouldReuse = !!(transform && transform.shouldReuse === true);
    if (!shouldReuse || !pixi) {
      return {
        active: false,
        reason: shouldReuse ? 'pixi-floor-transform-missing' : 'floor-reuse-inactive',
        floorSnapshot: floorSnapshot,
        transform: transform,
        scale: scale,
        spriteX: 0,
        spriteY: 0,
        floorBuildCameraX: toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0)),
        floorBuildCameraY: toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0)),
        floorBuildZoom: toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(reuse && reuse.builtZoom, 1)),
        floorCurrentZoom: toNumber(floorSnapshot && floorSnapshot.currentZoom, 1)
      };
    }
    return {
      active: true,
      reason: 'shared-floor-cache-reuse-transform-active',
      floorSnapshot: floorSnapshot,
      transform: transform,
      scale: scale,
      spriteX: toNumber(pixi && pixi.spriteX, 0),
      spriteY: toNumber(pixi && pixi.spriteY, 0),
      floorBuildCameraX: toNumber(transform && transform.builtCameraX, toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0))),
      floorBuildCameraY: toNumber(transform && transform.builtCameraY, toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0))),
      floorBuildZoom: toNumber(transform && transform.builtZoom, toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(reuse && reuse.builtZoom, 1))),
      floorCurrentZoom: toNumber(floorSnapshot && floorSnapshot.currentZoom, 1),
      floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
      floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0)),
      floorTransformScaled: !!(transform && transform.scaled === true)
    };
  }

  function mapNoCameraPointToFinalScreenPoint(pt, camera, renderTransform, deps) {
    if (renderTransform && renderTransform.active === true) {
      var builtNoCamera = projectCurrentNoCameraPointToBuiltNoCamera(pt, renderTransform.floorSnapshot, deps);
      var builtScreenX = toNumber(builtNoCamera && builtNoCamera.x, 0) + toNumber(renderTransform.floorBuildCameraX, 0);
      var builtScreenY = toNumber(builtNoCamera && builtNoCamera.y, 0) + toNumber(renderTransform.floorBuildCameraY, 0);
      return {
        x: toNumber(renderTransform.spriteX, 0) + toNumber(renderTransform.scale, 1) * builtScreenX,
        y: toNumber(renderTransform.spriteY, 0) + toNumber(renderTransform.scale, 1) * builtScreenY
      };
    }
    return addCameraPoint(pt, camera);
  }

  function mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps) {
    points = Array.isArray(points) ? points : [];
    var out = [];
    for (var i = 0; i < points.length; i += 1) out.push(mapNoCameraPointToFinalScreenPoint(points[i], camera, renderTransform, deps));
    return out;
  }

  function mapNoCameraPointToChunkCachePoint(pt, camera, renderTransform, deps) {
    // PXM-07.14C: RenderTexture chunks are cached in the same build-space used
    // by the shared floor reuse transform. Pan/zoom then updates only the chunk
    // sprite transform, instead of rebuilding the chunk texture for every
    // current-camera/current-zoom tick.
    if (renderTransform && renderTransform.active === true) {
      var builtNoCamera = projectCurrentNoCameraPointToBuiltNoCamera(pt, renderTransform.floorSnapshot, deps);
      return {
        x: toNumber(builtNoCamera && builtNoCamera.x, 0) + toNumber(renderTransform.floorBuildCameraX, 0),
        y: toNumber(builtNoCamera && builtNoCamera.y, 0) + toNumber(renderTransform.floorBuildCameraY, 0)
      };
    }
    return addCameraPoint(pt, camera);
  }

  function mapNoCameraPointsToChunkCachePoints(points, camera, renderTransform, deps) {
    points = Array.isArray(points) ? points : [];
    var out = [];
    for (var i = 0; i < points.length; i += 1) out.push(mapNoCameraPointToChunkCachePoint(points[i], camera, renderTransform, deps));
    return out;
  }

  function addCameraToPoints(points, camera) {
    points = Array.isArray(points) ? points : [];
    var out = [];
    for (var i = 0; i < points.length; i += 1) out.push(addCameraPoint(points[i], camera));
    return out;
  }

  function flatPointArray(points) {
    var arr = [];
    points = Array.isArray(points) ? points : [];
    for (var i = 0; i < points.length; i += 1) {
      arr.push(toNumber(points[i] && points[i].x, 0));
      arr.push(toNumber(points[i] && points[i].y, 0));
    }
    return arr;
  }

  function drawPolygonV8(graphics, points, fillCss, strokeCss, width) {
    if (!graphics || !Array.isArray(points) || points.length < 3) return false;
    var fill = parseCssColor(fillCss, 0xffffff, 1);
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (typeof graphics.poly === 'function') {
        // PixiJS v8 Graphics#poly accepts the point list directly. Passing a
        // Canvas2D-style/legacy `close` boolean can throw in some Pixi builds,
        // which made every static-world packet reject before Canvas2D skip.
        graphics.poly(flatPointArray(points));
        if (fillCss && typeof graphics.fill === 'function') graphics.fill({ color: fill.color, alpha: fill.alpha });
        if (strokeCss && typeof graphics.stroke === 'function') graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: Math.max(0, toNumber(width, 1)) });
        return true;
      }
    } catch (_) {}
    return false;
  }

  function drawPolygonLegacy(graphics, points, fillCss, strokeCss, width) {
    if (!graphics || !Array.isArray(points) || points.length < 3) return false;
    var fill = parseCssColor(fillCss, 0xffffff, 1);
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (fillCss && typeof graphics.beginFill === 'function') graphics.beginFill(fill.color, fill.alpha);
      if (strokeCss && typeof graphics.lineStyle === 'function') graphics.lineStyle(Math.max(0, toNumber(width, 1)), stroke.color, stroke.alpha);
      if (typeof graphics.moveTo === 'function') graphics.moveTo(toNumber(points[0].x, 0), toNumber(points[0].y, 0));
      for (var i = 1; i < points.length; i += 1) {
        if (typeof graphics.lineTo === 'function') graphics.lineTo(toNumber(points[i].x, 0), toNumber(points[i].y, 0));
      }
      if (typeof graphics.closePath === 'function') graphics.closePath();
      if (fillCss && typeof graphics.endFill === 'function') graphics.endFill();
      return true;
    } catch (_) {}
    return false;
  }

  function drawPolygon(graphics, points, fillCss, strokeCss, width) {
    return drawPolygonV8(graphics, points, fillCss, strokeCss, width) || drawPolygonLegacy(graphics, points, fillCss, strokeCss, width);
  }

  function drawSegment(graphics, a, b, strokeCss, width) {
    if (!graphics || !a || !b || !strokeCss) return false;
    var stroke = parseCssColor(strokeCss, 0x000000, 1);
    try {
      if (typeof graphics.moveTo === 'function' && typeof graphics.lineTo === 'function') {
        if (typeof graphics.stroke === 'function') {
          graphics.moveTo(toNumber(a.x, 0), toNumber(a.y, 0));
          graphics.lineTo(toNumber(b.x, 0), toNumber(b.y, 0));
          graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: Math.max(0, toNumber(width, 1)) });
          return true;
        }
        if (typeof graphics.lineStyle === 'function') graphics.lineStyle(Math.max(0, toNumber(width, 1)), stroke.color, stroke.alpha);
        graphics.moveTo(toNumber(a.x, 0), toNumber(a.y, 0));
        graphics.lineTo(toNumber(b.x, 0), toNumber(b.y, 0));
        return true;
      }
    } catch (_) {}
    return false;
  }

  function getGraphicsCapabilities(graphics) {
    return {
      poly: !!(graphics && typeof graphics.poly === 'function'),
      fill: !!(graphics && typeof graphics.fill === 'function'),
      stroke: !!(graphics && typeof graphics.stroke === 'function'),
      beginFill: !!(graphics && typeof graphics.beginFill === 'function'),
      drawPolygon: !!(graphics && typeof graphics.drawPolygon === 'function'),
      moveTo: !!(graphics && typeof graphics.moveTo === 'function'),
      lineTo: !!(graphics && typeof graphics.lineTo === 'function')
    };
  }

  function drawProjectedOverlays(graphics, packet, projected, camera, renderTransform, deps) {
    var overlays = projected && Array.isArray(projected.overlaysNoCamera) ? projected.overlaysNoCamera : [];
    var overlayCount = 0;
    for (var oi = 0; oi < overlays.length; oi += 1) {
      var overlay = overlays[oi] || {};
      var polys = Array.isArray(overlay.polysNoCamera) ? overlay.polysNoCamera : [];
      var alpha = Math.max(0, Math.min(0.95, toNumber(overlay.alpha != null ? overlay.alpha : overlay.baseAlpha, 0.18)));
      for (var pi = 0; pi < polys.length; pi += 1) {
        var pts = mapNoCameraPointsToFinalScreenPoints(polys[pi], camera, renderTransform, deps);
        if (pts.length >= 3 && drawPolygon(graphics, pts, 'rgba(0,0,0,' + String(alpha) + ')', null, 0)) overlayCount += 1;
      }
    }
    return overlayCount;
  }


  function getPixiApplication() {
    try {
      var renderer = getPixiWorldRenderer();
      if (renderer && typeof renderer.getPixiApplication === 'function') return renderer.getPixiApplication() || null;
    } catch (_) {}
    return null;
  }

  function getPixiRendererInstance() {
    try {
      var renderer = getPixiWorldRenderer();
      if (renderer && typeof renderer.getPixiRenderer === 'function') return renderer.getPixiRenderer() || null;
      var app = getPixiApplication();
      return app && app.renderer || null;
    } catch (_) {}
    return null;
  }

  function makeChunkRenderTexture(width, height) {
    var Pixi = getPixi();
    var RenderTexture = Pixi && Pixi.RenderTexture;
    if (!RenderTexture || typeof RenderTexture.create !== 'function') return null;
    var w = Math.max(1, Math.ceil(toNumber(width, 1)));
    var h = Math.max(1, Math.ceil(toNumber(height, 1)));
    try { return RenderTexture.create({ width: w, height: h, resolution: 1 }); } catch (_) {}
    try { return RenderTexture.create(w, h); } catch (_) {}
    return null;
  }

  function renderDisplayObjectToTexture(displayObject, texture) {
    var renderer = getPixiRendererInstance();
    if (!renderer || !displayObject || !texture || typeof renderer.render !== 'function') return false;
    try {
      renderer.render({ container: displayObject, target: texture, clear: true });
      return true;
    } catch (_) {}
    try {
      renderer.render(displayObject, { renderTexture: texture, clear: true });
      return true;
    } catch (_) {}
    try {
      renderer.render(displayObject, texture, true);
      return true;
    } catch (_) {}
    return false;
  }

  function makeLocalPoint(pt, minX, minY, padding) {
    return {
      x: toNumber(pt && pt.x, 0) - toNumber(minX, 0) + toNumber(padding, 0),
      y: toNumber(pt && pt.y, 0) - toNumber(minY, 0) + toNumber(padding, 0)
    };
  }

  function localizePoints(points, minX, minY, padding) {
    var out = [];
    points = Array.isArray(points) ? points : [];
    for (var i = 0; i < points.length; i += 1) out.push(makeLocalPoint(points[i], minX, minY, padding));
    return out;
  }

  function expandBoundsWithPoint(bounds, pt) {
    if (!bounds || !pt) return bounds;
    var x = toNumber(pt.x, 0);
    var y = toNumber(pt.y, 0);
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
    return bounds;
  }

  function expandBoundsWithPoints(bounds, points) {
    points = Array.isArray(points) ? points : [];
    for (var i = 0; i < points.length; i += 1) expandBoundsWithPoint(bounds, points[i]);
    return bounds;
  }

  function createEmptyBounds() {
    return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  }

  function boundsAreValid(bounds) {
    return !!(bounds && Number.isFinite(bounds.minX) && Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxX) && Number.isFinite(bounds.maxY) && bounds.maxX > bounds.minX && bounds.maxY > bounds.minY);
  }

  function buildPacketFinalDrawCommands(packet, projected, camera, renderTransform, deps) {
    var commands = [];
    var bounds = createEmptyBounds();
    var loops = Array.isArray(projected && projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    var points = Array.isArray(projected && projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    if (loops.length) {
      for (var li = 0; li < loops.length; li += 1) {
        var loopPts = mapNoCameraPointsToFinalScreenPoints(loops[li], camera, renderTransform, deps);
        if (loopPts.length >= 3) {
          expandBoundsWithPoints(bounds, loopPts);
          commands.push({ kind: 'polygon', points: loopPts, fill: packet && packet.fill, stroke: packet && packet.stroke, width: packet && (packet.width || 1) });
        }
      }
    } else {
      var pts = mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps);
      if (pts.length >= 3) {
        expandBoundsWithPoints(bounds, pts);
        commands.push({ kind: 'polygon', points: pts, fill: packet && packet.fill, stroke: packet && packet.stroke, width: packet && (packet.width || 1) });
      }
    }
    var outlineSegments = Array.isArray(projected && projected.outlineSegmentsNoCamera) ? projected.outlineSegmentsNoCamera : [];
    if (packet && packet.stroke && outlineSegments.length) {
      for (var oi = 0; oi < outlineSegments.length; oi += 1) {
        var seg = outlineSegments[oi];
        if (Array.isArray(seg) && seg[0] && seg[1]) {
          var a = mapNoCameraPointToFinalScreenPoint(seg[0], camera, renderTransform, deps);
          var b = mapNoCameraPointToFinalScreenPoint(seg[1], camera, renderTransform, deps);
          expandBoundsWithPoint(bounds, a);
          expandBoundsWithPoint(bounds, b);
          commands.push({ kind: 'segment', a: a, b: b, stroke: packet.stroke, width: packet.width || 1 });
        }
      }
    }
    var terrainBoundarySegments = Array.isArray(projected && projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
    if (packet && packet.terrainBoundaryStroke && packet.terrainBoundaryStrokeWidth && terrainBoundarySegments.length) {
      for (var bi = 0; bi < terrainBoundarySegments.length; bi += 1) {
        var bseg = terrainBoundarySegments[bi];
        if (Array.isArray(bseg) && bseg[0] && bseg[1]) {
          var ba = mapNoCameraPointToFinalScreenPoint(bseg[0], camera, renderTransform, deps);
          var bb = mapNoCameraPointToFinalScreenPoint(bseg[1], camera, renderTransform, deps);
          expandBoundsWithPoint(bounds, ba);
          expandBoundsWithPoint(bounds, bb);
          commands.push({ kind: 'segment', a: ba, b: bb, stroke: packet.terrainBoundaryStroke, width: packet.terrainBoundaryStrokeWidth });
        }
      }
    }
    var overlays = projected && Array.isArray(projected.overlaysNoCamera) ? projected.overlaysNoCamera : [];
    for (var ovi = 0; ovi < overlays.length; ovi += 1) {
      var overlay = overlays[ovi] || {};
      var polys = Array.isArray(overlay.polysNoCamera) ? overlay.polysNoCamera : [];
      var alpha = Math.max(0, Math.min(0.95, toNumber(overlay.alpha != null ? overlay.alpha : overlay.baseAlpha, 0.18)));
      for (var op = 0; op < polys.length; op += 1) {
        var ovPts = mapNoCameraPointsToFinalScreenPoints(polys[op], camera, renderTransform, deps);
        if (ovPts.length >= 3) {
          expandBoundsWithPoints(bounds, ovPts);
          commands.push({ kind: 'polygon', points: ovPts, fill: 'rgba(0,0,0,' + String(alpha) + ')', stroke: null, width: 0 });
        }
      }
    }
    return { commands: commands, bounds: bounds };
  }


  function buildPacketChunkCacheDrawCommandsCached(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps, chunkTextureSignature) {
    var signature = String(chunkTextureSignature || '');
    try {
      if (packet && packet.__pixiStaticChunkDrawDataSignature === signature && packet.__pixiStaticChunkDrawData) {
        packet.__pixiStaticChunkDrawDataCacheHit = true;
        return packet.__pixiStaticChunkDrawData;
      }
    } catch (_) {}
    var drawData = buildPacketChunkCacheDrawCommands(packet, projected, camera, renderTransform, deps);
    try {
      if (packet && signature) {
        packet.__pixiStaticChunkDrawDataSignature = signature;
        packet.__pixiStaticChunkDrawData = drawData;
        packet.__pixiStaticChunkDrawDataCacheHit = false;
      }
    } catch (_) {}
    return drawData;
  }

  function buildPacketChunkCacheDrawCommands(packet, projected, camera, renderTransform, deps) {
    var commands = [];
    var bounds = createEmptyBounds();
    var loops = Array.isArray(projected && projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    var points = Array.isArray(projected && projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    if (loops.length) {
      for (var li = 0; li < loops.length; li += 1) {
        var loopPts = mapNoCameraPointsToChunkCachePoints(loops[li], camera, renderTransform, deps);
        if (loopPts.length >= 3) {
          expandBoundsWithPoints(bounds, loopPts);
          commands.push({ kind: 'polygon', points: loopPts, fill: packet && packet.fill, stroke: packet && packet.stroke, width: packet && (packet.width || 1) });
        }
      }
    } else {
      var pts = mapNoCameraPointsToChunkCachePoints(points, camera, renderTransform, deps);
      if (pts.length >= 3) {
        expandBoundsWithPoints(bounds, pts);
        commands.push({ kind: 'polygon', points: pts, fill: packet && packet.fill, stroke: packet && packet.stroke, width: packet && (packet.width || 1) });
      }
    }
    var outlineSegments = Array.isArray(projected && projected.outlineSegmentsNoCamera) ? projected.outlineSegmentsNoCamera : [];
    if (packet && packet.stroke && outlineSegments.length) {
      for (var oi = 0; oi < outlineSegments.length; oi += 1) {
        var seg = outlineSegments[oi];
        if (Array.isArray(seg) && seg[0] && seg[1]) {
          var a = mapNoCameraPointToChunkCachePoint(seg[0], camera, renderTransform, deps);
          var b = mapNoCameraPointToChunkCachePoint(seg[1], camera, renderTransform, deps);
          expandBoundsWithPoint(bounds, a);
          expandBoundsWithPoint(bounds, b);
          commands.push({ kind: 'segment', a: a, b: b, stroke: packet.stroke, width: packet.width || 1 });
        }
      }
    }
    var terrainBoundarySegments = Array.isArray(projected && projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
    if (packet && packet.terrainBoundaryStroke && packet.terrainBoundaryStrokeWidth && terrainBoundarySegments.length) {
      for (var bi = 0; bi < terrainBoundarySegments.length; bi += 1) {
        var bseg = terrainBoundarySegments[bi];
        if (Array.isArray(bseg) && bseg[0] && bseg[1]) {
          var ba = mapNoCameraPointToChunkCachePoint(bseg[0], camera, renderTransform, deps);
          var bb = mapNoCameraPointToChunkCachePoint(bseg[1], camera, renderTransform, deps);
          expandBoundsWithPoint(bounds, ba);
          expandBoundsWithPoint(bounds, bb);
          commands.push({ kind: 'segment', a: ba, b: bb, stroke: packet.terrainBoundaryStroke, width: packet.terrainBoundaryStrokeWidth });
        }
      }
    }
    var overlays = projected && Array.isArray(projected.overlaysNoCamera) ? projected.overlaysNoCamera : [];
    for (var ovi = 0; ovi < overlays.length; ovi += 1) {
      var overlay = overlays[ovi] || {};
      var polys = Array.isArray(overlay.polysNoCamera) ? overlay.polysNoCamera : [];
      var alpha = Math.max(0, Math.min(0.95, toNumber(overlay.alpha != null ? overlay.alpha : overlay.baseAlpha, 0.18)));
      for (var op = 0; op < polys.length; op += 1) {
        var ovPts = mapNoCameraPointsToChunkCachePoints(polys[op], camera, renderTransform, deps);
        if (ovPts.length >= 3) {
          expandBoundsWithPoints(bounds, ovPts);
          commands.push({ kind: 'polygon', points: ovPts, fill: 'rgba(0,0,0,' + String(alpha) + ')', stroke: null, width: 0 });
        }
      }
    }
    return { commands: commands, bounds: bounds };
  }

  function drawLocalCommand(graphics, command, minX, minY, padding) {
    if (!graphics || !command) return false;
    if (command.kind === 'polygon') {
      return drawPolygon(graphics, localizePoints(command.points, minX, minY, padding), command.fill, command.stroke, command.width || 1);
    }
    if (command.kind === 'segment') {
      return drawSegment(graphics, makeLocalPoint(command.a, minX, minY, padding), makeLocalPoint(command.b, minX, minY, padding), command.stroke, command.width || 1);
    }
    return false;
  }

  function getStableDepthBandBucketSize() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticChunkDepthBandSize'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) n = 1;
    return Math.max(0.25, Math.min(16, n));
  }

  function bucketNumber(value, size) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 'na';
    var s = Number(size);
    if (!Number.isFinite(s) || s <= 0) s = 1;
    return String(Math.floor(n / s));
  }

  function getPacketStableDepthBand(packet) {
    packet = packet || {};
    var size = getStableDepthBandBucketSize();
    var sortKey = Number(packet.sortKey);
    var depthKey = Number(packet.depthKey);
    var cellZ = Number(packet.cellZ);
    var cellX = Number(packet.cellX);
    var cellY = Number(packet.cellY);
    var primary = Number.isFinite(sortKey)
      ? 'sort:' + bucketNumber(sortKey, size)
      : 'iso:' + bucketNumber((Number.isFinite(cellX) ? cellX : 0) + (Number.isFinite(cellY) ? cellY : 0) + (Number.isFinite(cellZ) ? cellZ : 0), size);
    var depth = Number.isFinite(depthKey) ? 'depth:' + bucketNumber(depthKey, 1) : 'depth:na';
    var z = Number.isFinite(cellZ) ? 'z:' + bucketNumber(cellZ, 1) : 'z:na';
    return primary + '|' + depth + '|' + z;
  }

  function getExternalChunkCacheGroupingMode() {
    // PXM-07.18K1: in Pixi strict mode, non-player-sensitive static chunks
    // must use chunkKey-only RenderTexture caching.  The legacy
    // chunkKey+stableDepthBand grouping was proven to fragment a 25-visible-
    // chunk scene into thousands of sprites, so it is no longer a valid
    // fallback path for external chunks.
    return 'chunk-key-only-strict';
  }

  function getChunkRenderKey(packet, runStartIndex) {
    var rawChunk = '';
    try { rawChunk = packet && packet.chunkKey != null ? String(packet.chunkKey) : ''; } catch (_) { rawChunk = ''; }
    if (!rawChunk) rawChunk = 'chunk:unknown';
    return rawChunk;
  }

  function assertNoLegacyStableDepthBandChunkGroups(groups, context) {
    var list = Array.isArray(groups) ? groups : [];
    var offenders = [];
    for (var i = 0; i < list.length; i += 1) {
      var key = list[i] && list[i].chunkKey != null ? String(list[i].chunkKey) : '';
      if (key.indexOf('|band=') !== -1) {
        offenders.push({
          chunkKey: key,
          packetCount: toNumber(list[i] && list[i].packetCount, 0),
          stableDepthBand: list[i] && list[i].stableDepthBand ? String(list[i].stableDepthBand) : ''
        });
        if (offenders.length >= 8) break;
      }
    }
    if (!offenders.length) return;
    var payload = {
      step: 'PXM-07.18K1',
      reason: 'legacy-stable-depth-band-path-used-in-pixi-strict-mode',
      context: context || 'chunk-render-texture',
      groupingMode: getExternalChunkCacheGroupingMode(),
      offenderCount: offenders.length,
      offenders: offenders
    };
    try { emit('PIXI-STATIC-CHUNK-STRICT-FAIL', payload); } catch (_) {}
    throw new Error('[PXM][Pixi strict mode] External static chunk used legacy stableDepthBand grouping. context=' + String(payload.context));
  }

  function clearUnusedChunkSprites(usedCount) {
    for (var i = Math.max(0, usedCount || 0); i < state.chunkSpritePool.length; i += 1) {
      var sprite = state.chunkSpritePool[i];
      try { if (sprite) sprite.visible = false; } catch (_) {}
    }
  }

  function getChunkSprite(index, container) {
    var Pixi = getPixi();
    var Sprite = Pixi && Pixi.Sprite;
    if (typeof Sprite !== 'function' || !container) return null;
    var sprite = state.chunkSpritePool[index] || null;
    if (!sprite) {
      try {
        sprite = new Sprite();
        sprite.label = 'pixi-static-world-chunk-render-texture-' + String(index);
        try { sprite.eventMode = 'none'; } catch (_) {}
        state.chunkSpritePool[index] = sprite;
        if (typeof container.addChild === 'function') container.addChild(sprite);
      } catch (_) { return null; }
    } else {
      try { if (sprite.parent !== container && typeof container.addChild === 'function') container.addChild(sprite); } catch (_) {}
    }
    try { sprite.visible = true; } catch (_) {}
    return sprite;
  }

  function hidePerPacketGraphics() {
    for (var i = 0; i < state.graphicsPool.length; i += 1) {
      try { if (state.graphicsPool[i]) state.graphicsPool[i].visible = false; } catch (_) {}
    }
  }

  function getStableLocalDemergeLastState() {
    try { return global.__STABLE_LOCAL_DEMERGE_LAST_STATE__ || null; } catch (_) {}
    return null;
  }

  function isGlobalFaceMergeActiveForPlayerLocalDemerge() {
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    return !(faceMerge && String(faceMerge.effectiveFaceMergeMode || 'merge') === 'no-merge');
  }

  function getPacketChunkKey(packet) {
    try {
      if (packet && packet.chunkKey != null) return String(packet.chunkKey || '');
      if (packet && packet.actorInteractionStableDemergeChunkKey != null) return String(packet.actorInteractionStableDemergeChunkKey || '');
    } catch (_) {}
    return '';
  }

  function isPlayerChunkSensitivePacket(packet) {
    if (!packet || typeof packet !== 'object') return false;
    if (!isGlobalFaceMergeActiveForPlayerLocalDemerge()) return false;
    var state = getStableLocalDemergeLastState();
    if (!state || state.active !== true) return false;
    var playerChunkKey = state.playerInteractionChunkKey ? String(state.playerInteractionChunkKey) : '';
    if (!playerChunkKey || playerChunkKey === 'none') return false;
    return getPacketChunkKey(packet) === playerChunkKey;
  }

  function isPlayerSensitiveDemergedPacket(packet) {
    if (!packet || typeof packet !== 'object') return false;
    // PXM-07.14K: keep the active player chunk dynamic; external chunks stay stable but are split by stable depth band rather than player-driven runStartIndex.
    // This keeps the chunk boundary fixed until the player enters another chunk,
    // instead of following every actor interaction cell.
    if (isPlayerChunkSensitivePacket(packet)) return true;
    if (!isGlobalFaceMergeActiveForPlayerLocalDemerge()) return false;
    if (packet.actorInteractionStableDemergedFace === true) return true;
    if (packet.actorInteractionStableLocalDemerge === true && String(packet.actorInteractionStableDemergeMode || '') === 'near-single') return true;
    if (String(packet.actorInteractionGroupFootprintMode || '') === 'stable-local-demerge-near-player') return true;
    return false;
  }

  function splitChunkTextureEligibleItems(items) {
    var out = { chunkItems: [], playerSensitiveItems: [], playerSensitivePacketCount: 0 };
    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (item && isPlayerSensitiveDemergedPacket(item.packet)) {
        out.playerSensitiveItems.push(item);
        out.playerSensitivePacketCount += 1;
      } else {
        out.chunkItems.push(item);
      }
    }
    return out;
  }

  function hashString32(seed, value) {
    var h = Number(seed);
    if (!Number.isFinite(h)) h = 2166136261;
    var str = String(value == null ? '' : value);
    for (var i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      // FNV-1a 32-bit multiply, expressed with imul to avoid float drift.
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function hashPacketEligibilityFields(hash, packet, orderIndex) {
    var p = packet || {};
    var h = hashString32(hash, orderIndex);
    h = hashString32(h, p.id || '');
    h = hashString32(h, p.instanceId || '');
    h = hashString32(h, getPacketChunkKey(p));
    h = hashString32(h, p.actorInteractionStableDemergedFace === true ? 'stable-demerged-face=1' : 'stable-demerged-face=0');
    h = hashString32(h, p.actorInteractionStableLocalDemerge === true ? 'stable-local-demerge=1' : 'stable-local-demerge=0');
    h = hashString32(h, p.actorInteractionStableDemergeMode || '');
    h = hashString32(h, p.actorInteractionGroupFootprintMode || '');
    return h >>> 0;
  }

  function getChunkEligibilityPolicySignature() {
    var demergeState = getStableLocalDemergeLastState();
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    return [
      'chunk-eligibility-split-v=07.18I',
      'globalFaceMerge=' + String(isGlobalFaceMergeActiveForPlayerLocalDemerge()),
      'playerStateActive=' + String(!!(demergeState && demergeState.active === true)),
      'playerChunk=' + String(demergeState && demergeState.playerInteractionChunkKey ? demergeState.playerInteractionChunkKey : ''),
      'demergeMode=' + String(demergeState && demergeState.mode ? demergeState.mode : ''),
      'faceMerge=' + String(faceMerge && faceMerge.effectiveFaceMergeMode || ''),
      'pendingFaceMerge=' + String(faceMerge && faceMerge.pendingFaceMergeMode || '')
    ].join('|');
  }

  function makeChunkEligibilitySplitCacheKey(items, itemHash) {
    var list = Array.isArray(items) ? items : [];
    var first = list.length ? list[0] : null;
    var last = list.length ? list[list.length - 1] : null;
    return [
      getChunkEligibilityPolicySignature(),
      'n=' + String(list.length),
      'hash=' + String((Number(itemHash) >>> 0).toString(36)),
      'first=' + String(first && first.packet && first.packet.id || '') + '@' + String(getItemOrderIndex(first)),
      'last=' + String(last && last.packet && last.packet.id || '') + '@' + String(getItemOrderIndex(last))
    ].join('|');
  }

  function makeChunkEligibilitySplitIndexPayload(split, items) {
    var itemIndexMap = Object.create(null);
    var list = Array.isArray(items) ? items : [];
    for (var i = 0; i < list.length; i += 1) itemIndexMap[String(getItemOrderIndex(list[i])) + '|' + packetIdForDiagnostics(list[i] && list[i].packet)] = i;
    function indicesFor(arr) {
      var out = [];
      var source = Array.isArray(arr) ? arr : [];
      for (var j = 0; j < source.length; j += 1) {
        var item = source[j];
        var key = String(getItemOrderIndex(item)) + '|' + packetIdForDiagnostics(item && item.packet);
        if (itemIndexMap[key] != null) out.push(itemIndexMap[key]);
      }
      return out;
    }
    return {
      chunkIndices: indicesFor(split && split.chunkItems),
      playerSensitiveIndices: indicesFor(split && split.playerSensitiveItems),
      playerSensitivePacketCount: split && split.playerSensitivePacketCount != null ? toNumber(split.playerSensitivePacketCount, 0) : 0
    };
  }

  function materializeChunkEligibilitySplitFromIndices(payload, items) {
    var list = Array.isArray(items) ? items : [];
    var out = { chunkItems: [], playerSensitiveItems: [], playerSensitivePacketCount: 0 };
    var chunkIndices = payload && Array.isArray(payload.chunkIndices) ? payload.chunkIndices : [];
    var sensitiveIndices = payload && Array.isArray(payload.playerSensitiveIndices) ? payload.playerSensitiveIndices : [];
    for (var i = 0; i < chunkIndices.length; i += 1) {
      var ci = chunkIndices[i];
      if (list[ci]) out.chunkItems.push(list[ci]);
    }
    for (var s = 0; s < sensitiveIndices.length; s += 1) {
      var si = sensitiveIndices[s];
      if (list[si]) out.playerSensitiveItems.push(list[si]);
    }
    out.playerSensitivePacketCount = payload && payload.playerSensitivePacketCount != null ? toNumber(payload.playerSensitivePacketCount, out.playerSensitiveItems.length) : out.playerSensitiveItems.length;
    return out;
  }

  function getChunkEligibilitySplitCacheLimit() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiChunkEligibilitySplitCacheLimit'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 16) n = 256;
    return Math.max(16, Math.min(4096, Math.floor(n)));
  }

  function pruneChunkEligibilitySplitCache(activeKey) {
    var cache = state.chunkEligibilitySplitCache || null;
    if (!cache) return { removed: 0, size: 0 };
    var keys = Object.keys(cache);
    var limit = getChunkEligibilitySplitCacheLimit();
    if (keys.length <= limit) return { removed: 0, size: keys.length };
    keys.sort(function (a, b) {
      var av = cache[a] && cache[a].lastUsedSeq || 0;
      var bv = cache[b] && cache[b].lastUsedSeq || 0;
      return av - bv;
    });
    var removed = 0;
    var target = Math.max(8, Math.floor(limit * 0.8));
    for (var i = 0; i < keys.length && Object.keys(cache).length > target; i += 1) {
      var key = keys[i];
      if (activeKey && key === activeKey) continue;
      try { delete cache[key]; removed += 1; } catch (_) {}
    }
    return { removed: removed, size: Object.keys(cache).length };
  }

  function splitChunkTextureEligibleItemsCached(items, itemHash) {
    var startedAt = nowMs();
    var key = makeChunkEligibilitySplitCacheKey(items, itemHash);
    var cache = state.chunkEligibilitySplitCache && state.chunkEligibilitySplitCache[key] || null;
    var out = {
      split: null,
      cacheKey: key,
      cacheHit: false,
      buildCount: 0,
      reuseCount: 0,
      cacheHitRate: 0,
      rebuildReason: '',
      materializeMs: 0,
      computeMs: 0,
      pruneRemovedCount: 0,
      cacheSize: 0,
      totalMs: 0
    };
    state.chunkEligibilitySplitCacheSeq += 1;
    if (cache && cache.payload) {
      var materializeStartedAt = nowMs();
      out.split = materializeChunkEligibilitySplitFromIndices(cache.payload, items);
      out.materializeMs = Math.max(0, nowMs() - materializeStartedAt);
      out.cacheHit = true;
      out.reuseCount = 1;
      out.cacheHitRate = 1;
      out.rebuildReason = 'reused-chunk-eligibility-split';
      cache.lastUsedSeq = state.chunkEligibilitySplitCacheSeq;
    } else {
      var computeStartedAt = nowMs();
      out.split = splitChunkTextureEligibleItems(items);
      out.computeMs = Math.max(0, nowMs() - computeStartedAt);
      out.buildCount = 1;
      out.rebuildReason = 'split-cache-miss-or-policy-changed';
      if (!state.chunkEligibilitySplitCache) state.chunkEligibilitySplitCache = Object.create(null);
      state.chunkEligibilitySplitCache[key] = {
        payload: makeChunkEligibilitySplitIndexPayload(out.split, items),
        lastUsedSeq: state.chunkEligibilitySplitCacheSeq
      };
    }
    var prune = pruneChunkEligibilitySplitCache(key);
    out.pruneRemovedCount = prune.removed;
    out.cacheSize = prune.size;
    out.totalMs = Math.max(0, nowMs() - startedAt);
    return out;
  }


  function getItemOrderIndex(item) {
    var n = Number(item && item.orderIndex);
    if (Number.isFinite(n)) return n;
    return toNumber(item && item.runStartIndex, 0) + toNumber(item && item.packetIndex, 0);
  }

  function packetIdForDiagnostics(packet) {
    try { return packet && packet.id != null ? String(packet.id) : ''; } catch (_) {}
    return '';
  }

  function makeOrderRunCacheGroupKey(prefix, groupIndex, firstItem, lastItem) {
    return [
      String(prefix || 'order-run'),
      'g=' + String(groupIndex),
      'start=' + String(getItemOrderIndex(firstItem)),
      'end=' + String(getItemOrderIndex(lastItem)),
      'first=' + packetIdForDiagnostics(firstItem && firstItem.packet),
      'last=' + packetIdForDiagnostics(lastItem && lastItem.packet)
    ].join('|');
  }

  function buildOrderRunCacheDiagnostics(allItems, chunkEligibilitySplit, order, assetClassificationSummary) {
    var list = Array.isArray(allItems) ? allItems.slice() : [];
    list.sort(function (a, b) { return getItemOrderIndex(a) - getItemOrderIndex(b); });
    var externalItems = chunkEligibilitySplit && Array.isArray(chunkEligibilitySplit.chunkItems) ? chunkEligibilitySplit.chunkItems : [];
    var sensitiveItems = chunkEligibilitySplit && Array.isArray(chunkEligibilitySplit.playerSensitiveItems) ? chunkEligibilitySplit.playerSensitiveItems : [];
    var sensitiveByOrder = Object.create(null);
    var externalByOrder = Object.create(null);
    var playerSensitiveChunkCounts = Object.create(null);
    for (var si = 0; si < sensitiveItems.length; si += 1) {
      var sitem = sensitiveItems[si];
      sensitiveByOrder[String(getItemOrderIndex(sitem))] = true;
      countObjectKey(playerSensitiveChunkCounts, getPacketChunkKey(sitem && sitem.packet));
    }
    for (var ei = 0; ei < externalItems.length; ei += 1) externalByOrder[String(getItemOrderIndex(externalItems[ei]))] = true;

    var orderLength = Array.isArray(order) ? order.length : 0;
    var staticPacketCount = list.length;
    var nonStaticOrderItemCount = Math.max(0, orderLength - staticPacketCount);
    var sensitiveRunCount = 0;
    var sensitiveCacheableRunCount = 0;
    var sensitiveBeneficialRunCount = 0;
    var sensitiveSingletonRunCount = 0;
    var sensitiveRunPacketCount = 0;
    var sensitiveCacheablePacketCount = 0;
    var sensitiveBeneficialPacketCount = 0;
    var sensitiveNonCacheablePacketCount = 0;
    var maxSensitiveRunPacketCount = 0;
    var minSensitiveRunPacketCount = sensitiveItems.length ? Infinity : 0;
    var orderBoundaryCrossingCount = 0;
    var orderInversionRiskCount = 0;
    var nonConsecutiveBreakCount = 0;
    var externalStaticInterleaveBreakCount = 0;
    var dynamicBarrierBreakCount = nonStaticOrderItemCount;
    var sampleRuns = [];

    function finalizeRun(runItems, endReason) {
      if (!runItems || !runItems.length) return;
      sensitiveRunCount += 1;
      sensitiveRunPacketCount += runItems.length;
      maxSensitiveRunPacketCount = Math.max(maxSensitiveRunPacketCount, runItems.length);
      minSensitiveRunPacketCount = Math.min(minSensitiveRunPacketCount, runItems.length);
      if (runItems.length === 1) sensitiveSingletonRunCount += 1;
      var valid = true;
      var commandCount = 0;
      var minOrder = Infinity;
      var maxOrder = -Infinity;
      var minSort = Infinity;
      var maxSort = -Infinity;
      var minDepth = Infinity;
      var maxDepth = -Infinity;
      var chunkCounts = Object.create(null);
      for (var ri = 0; ri < runItems.length; ri += 1) {
        var item = runItems[ri];
        var orderIndex = getItemOrderIndex(item);
        minOrder = Math.min(minOrder, orderIndex);
        maxOrder = Math.max(maxOrder, orderIndex);
        minSort = Math.min(minSort, toNumber(item && item.packet && item.packet.sortKey, 0));
        maxSort = Math.max(maxSort, toNumber(item && item.packet && item.packet.sortKey, 0));
        minDepth = Math.min(minDepth, toNumber(item && item.packet && item.packet.depthKey, 0));
        maxDepth = Math.max(maxDepth, toNumber(item && item.packet && item.packet.depthKey, 0));
        countObjectKey(chunkCounts, getPacketChunkKey(item && item.packet));
        if (!(item && item.drawData && Array.isArray(item.drawData.commands) && item.drawData.commands.length)) valid = false;
        commandCount += item && item.drawData && Array.isArray(item.drawData.commands) ? item.drawData.commands.length : 0;
        if (ri > 0 && getItemOrderIndex(runItems[ri - 1]) + 1 !== orderIndex) {
          valid = false;
          orderBoundaryCrossingCount += 1;
          orderInversionRiskCount += 1;
        }
      }
      if (valid) {
        sensitiveCacheableRunCount += 1;
        sensitiveCacheablePacketCount += runItems.length;
        if (runItems.length >= 2) {
          sensitiveBeneficialRunCount += 1;
          sensitiveBeneficialPacketCount += runItems.length;
        }
      } else {
        sensitiveNonCacheablePacketCount += runItems.length;
      }
      if (sampleRuns.length < 10) {
        var firstItem = runItems[0];
        var lastItem = runItems[runItems.length - 1];
        sampleRuns.push({
          groupKey: makeOrderRunCacheGroupKey('player-sensitive-order-run', sensitiveRunCount - 1, firstItem, lastItem),
          runStartIndex: firstItem && firstItem.runStartIndex != null ? firstItem.runStartIndex : null,
          startOrderIndex: Number.isFinite(minOrder) ? minOrder : null,
          endOrderIndex: Number.isFinite(maxOrder) ? maxOrder : null,
          packetCount: runItems.length,
          commandCount: commandCount,
          firstPacketId: packetIdForDiagnostics(firstItem && firstItem.packet),
          lastPacketId: packetIdForDiagnostics(lastItem && lastItem.packet),
          chunkCounts: chunkCounts,
          sortSpan: roundDiag(maxSort - minSort, 3),
          depthSpan: roundDiag(maxDepth - minDepth, 3),
          cacheable: valid,
          beneficial: valid && runItems.length >= 2,
          endReason: String(endReason || '')
        });
      }
    }

    var currentRun = [];
    var previousSensitiveOrder = null;
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var orderIndex = getItemOrderIndex(item);
      var isSensitive = !!sensitiveByOrder[String(orderIndex)];
      if (!isSensitive) {
        if (currentRun.length) finalizeRun(currentRun, externalByOrder[String(orderIndex)] ? 'external-static-interleave' : 'non-sensitive-static');
        currentRun = [];
        previousSensitiveOrder = null;
        if (externalByOrder[String(orderIndex)]) externalStaticInterleaveBreakCount += 1;
        continue;
      }
      if (currentRun.length && previousSensitiveOrder != null && orderIndex !== previousSensitiveOrder + 1) {
        nonConsecutiveBreakCount += 1;
        finalizeRun(currentRun, 'non-consecutive-order-boundary');
        currentRun = [];
      }
      currentRun.push(item);
      previousSensitiveOrder = orderIndex;
    }
    if (currentRun.length) finalizeRun(currentRun, 'end-of-static-items');
    if (!Number.isFinite(minSensitiveRunPacketCount)) minSensitiveRunPacketCount = 0;

    var currentDrawUnitsForStaticWorld = externalItems.length + sensitiveItems.length;
    var estimatedDrawUnitsWithExistingExternalCache = sensitiveItems.length;
    var estimatedPlayerSensitiveDrawUnitsAfterRunCache = sensitiveCacheableRunCount + sensitiveNonCacheablePacketCount;
    var estimatedPlayerSensitiveDrawUnitsAfterBeneficialOnly = sensitiveBeneficialRunCount + (sensitiveItems.length - sensitiveBeneficialPacketCount);
    var estimatedReductionIfCacheAllRuns = Math.max(0, sensitiveItems.length - estimatedPlayerSensitiveDrawUnitsAfterRunCache);
    var estimatedReductionIfCacheBeneficialRuns = Math.max(0, sensitiveItems.length - estimatedPlayerSensitiveDrawUnitsAfterBeneficialOnly);
    var safeFaceCoverage = assetClassificationSummary && assetClassificationSummary.safeFacePacketModelCoverageRate != null ? toNumber(assetClassificationSummary.safeFacePacketModelCoverageRate, 0) : 0;
    var largeAtomicSpriteCount = assetClassificationSummary && assetClassificationSummary.largeAtomicSpriteCount != null ? toNumber(assetClassificationSummary.largeAtomicSpriteCount, 0) : 0;
    var atomicSpriteCount = assetClassificationSummary && assetClassificationSummary.atomicSpriteCount != null ? toNumber(assetClassificationSummary.atomicSpriteCount, 0) : 0;
    var atomicBarrierCount = largeAtomicSpriteCount + atomicSpriteCount;
    if (atomicBarrierCount > 0) orderInversionRiskCount += atomicBarrierCount;

    return {
      frameSeq: state.frameSeq,
      orderLength: orderLength,
      staticPacketCount: staticPacketCount,
      nonStaticOrderItemCount: nonStaticOrderItemCount,
      externalChunkCacheCandidatePacketCount: externalItems.length,
      playerSensitivePacketCount: sensitiveItems.length,
      playerSensitiveChunkCounts: playerSensitiveChunkCounts,
      playerChunkWholeChunkCacheBlocked: sensitiveItems.length > 0,
      playerSensitiveOrderRunCount: sensitiveRunCount,
      playerSensitiveOrderRunPacketCount: sensitiveRunPacketCount,
      playerSensitiveOrderRunMinPacketCount: minSensitiveRunPacketCount,
      playerSensitiveOrderRunMaxPacketCount: maxSensitiveRunPacketCount,
      playerSensitiveOrderRunAvgPacketCount: sensitiveRunCount ? roundDiag(sensitiveRunPacketCount / sensitiveRunCount, 3) : 0,
      playerSensitiveOrderRunSingletonCount: sensitiveSingletonRunCount,
      playerSensitiveOrderRunCacheableCount: sensitiveCacheableRunCount,
      playerSensitiveOrderRunCacheablePacketCount: sensitiveCacheablePacketCount,
      playerSensitiveOrderRunBeneficialCount: sensitiveBeneficialRunCount,
      playerSensitiveOrderRunBeneficialPacketCount: sensitiveBeneficialPacketCount,
      playerSensitiveOrderRunNonCacheablePacketCount: sensitiveNonCacheablePacketCount,
      playerSensitiveOrderRunCacheableCoverageRate: sensitiveItems.length ? roundDiag(sensitiveCacheablePacketCount / sensitiveItems.length, 4) : 0,
      playerSensitiveOrderRunBeneficialCoverageRate: sensitiveItems.length ? roundDiag(sensitiveBeneficialPacketCount / sensitiveItems.length, 4) : 0,
      estimatedPlayerSensitiveDrawUnitsCurrent: sensitiveItems.length,
      estimatedPlayerSensitiveDrawUnitsAfterRunCache: estimatedPlayerSensitiveDrawUnitsAfterRunCache,
      estimatedPlayerSensitiveDrawUnitsAfterBeneficialOnly: estimatedPlayerSensitiveDrawUnitsAfterBeneficialOnly,
      estimatedDrawUnitReductionIfCacheAllRuns: estimatedReductionIfCacheAllRuns,
      estimatedDrawUnitReductionIfCacheBeneficialRuns: estimatedReductionIfCacheBeneficialRuns,
      estimatedDrawUnitReductionRateIfCacheAllRuns: sensitiveItems.length ? roundDiag(estimatedReductionIfCacheAllRuns / sensitiveItems.length, 4) : 0,
      estimatedDrawUnitReductionRateIfCacheBeneficialRuns: sensitiveItems.length ? roundDiag(estimatedReductionIfCacheBeneficialRuns / sensitiveItems.length, 4) : 0,
      currentDrawUnitsForStaticWorldWithoutChunkSprites: currentDrawUnitsForStaticWorld,
      estimatedDrawUnitsWithExistingExternalCache: estimatedDrawUnitsWithExistingExternalCache,
      nonConsecutiveBreakCount: nonConsecutiveBreakCount,
      externalStaticInterleaveBreakCount: externalStaticInterleaveBreakCount,
      dynamicBarrierBreakCount: dynamicBarrierBreakCount,
      orderBoundaryCrossingCount: orderBoundaryCrossingCount,
      orderInversionRiskCount: orderInversionRiskCount,
      atomicBarrierCount: atomicBarrierCount,
      safeFacePacketModelCoverageRate: safeFaceCoverage,
      eligibleForActiveOrderRunCache: orderInversionRiskCount === 0 && sensitiveCacheablePacketCount > 0 && safeFaceCoverage >= 0.99,
      activeOrderRunCacheEnabled: false,
      activeOrderRunCacheReason: 'diagnostics-only-no-visual-change',
      samplePlayerSensitiveOrderRuns: sampleRuns
    };
  }

  function emitOrderRunCacheDiagnostics(summary) {
    summary = summary || {};
    var signature = '';
    try {
      signature = JSON.stringify({
        p: summary.playerSensitivePacketCount,
        r: summary.playerSensitiveOrderRunCount,
        c: summary.playerSensitiveOrderRunCacheablePacketCount,
        b: summary.playerSensitiveOrderRunBeneficialPacketCount,
        risk: summary.orderInversionRiskCount,
        chunks: summary.playerSensitiveChunkCounts
      });
    } catch (_) { signature = String(summary.playerSensitivePacketCount || 0) + '|' + String(summary.playerSensitiveOrderRunCount || 0); }
    var now = nowMs();
    if (signature === state.lastOrderRunCacheDiagnosticsSignature && (now - Number(state.lastOrderRunCacheDiagnosticsEmitAt || 0)) < 5000) return;
    state.lastOrderRunCacheDiagnosticsSignature = signature;
    state.lastOrderRunCacheDiagnosticsEmitAt = now;
    state.lastOrderRunCacheDiagnosticsSummary = summary;
    emit('order-run-cache-diagnostics', summary);
  }


  function emitOrderRunCacheEvidence(summary) {
    summary = summary || {};
    var signature = '';
    try {
      signature = JSON.stringify({
        framePlanId: summary.framePlanId,
        playerChunk: summary.playerLocalFaceDemergeChunkKey,
        staticPacketCount: summary.staticPacketCount,
        sensitivePacketCount: summary.playerSensitivePacketCount,
        orderRunCount: summary.orderRunRenderTextureCount,
        orderRunHitRate: summary.orderRunRenderTextureHitRate,
        orderRunMissCount: summary.orderRunRenderTextureMissCount,
        drawDataMissCount: summary.staticPacketDrawDataBuildCount,
        projectedMissCount: summary.projectedGeometryCacheMissCount,
        splitHit: summary.chunkEligibilitySplitCacheHit,
        splitBuildCount: summary.chunkEligibilitySplitBuildCount,
        actualGraphicsPacketDrawCount: summary.actualGraphicsPacketDrawCount,
        drawWallBucket: Math.floor(toNumber(summary.drawWallMs, 0) / 8)
      });
    } catch (_) { signature = String(summary.frameSeq || 0) + '|' + String(summary.drawWallMs || 0); }
    var now = nowMs();
    var isSpike = toNumber(summary.drawWallMs, 0) >= 24 || toNumber(summary.orderRunRenderTextureMissCount, 0) > 0 || toNumber(summary.staticPacketDrawDataBuildCount, 0) > 0;
    if (!isSpike && signature === state.lastOrderRunCacheEvidenceSignature && (now - Number(state.lastOrderRunCacheEvidenceEmitAt || 0)) < 3000) return;
    state.lastOrderRunCacheEvidenceSignature = signature;
    state.lastOrderRunCacheEvidenceEmitAt = now;
    state.lastOrderRunCacheEvidenceSummary = summary;
    emit('order-run-cache-evidence', summary);
  }


  function countObjectKey(map, key) {
    if (!map) return;
    var k = String(key || 'unknown');
    map[k] = (map[k] || 0) + 1;
  }

  function roundDiag(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return 0;
    var factor = Math.pow(10, digits == null ? 3 : digits);
    return Math.round(n * factor) / factor;
  }


  function resetStaticWorldPerformanceAssessmentWindow(reason) {
    state.staticWorldPerformanceAssessment = {
      reason: String(reason || 'init'),
      startedAtMs: nowMs(),
      firstFrameSeq: state.frameSeq,
      lastFrameSeq: state.frameSeq,
      frameCount: 0,
      drawWallSum: 0,
      totalBeginFrameSum: 0,
      staticPacketItemLoopSum: 0,
      staticPacketCountSum: 0,
      actualDrawUnitCountSum: 0,
      fastHitFrameCount: 0,
      fastHitDrawWallSum: 0,
      fastHitStaticPacketItemLoopSum: 0,
      globalMissFrameCount: 0,
      globalMissDrawWallSum: 0,
      globalMissStaticPacketItemLoopSum: 0,
      chunkAssistGlobalMissFrameCount: 0,
      chunkAssistGlobalMissDrawWallSum: 0,
      chunkAssistHitPacketCountSum: 0,
      chunkNoHitGlobalMissFrameCount: 0,
      chunkNoHitGlobalMissDrawWallSum: 0,
      chunkPlanLookupMsSum: 0,
      chunkPlanMaterializeMsSum: 0,
      chunkPlanHitPacketCountSum: 0,
      chunkPlanMissPacketCountSum: 0,
      chunkPlanBuiltPacketCountSum: 0,
      renderTextureMissFrameCount: 0,
      graphicsPacketFrameCount: 0,
      worstDrawWallMs: 0,
      worstFrameSeq: 0,
      lastEmitFrameSeq: 0,
      lastEmitAtMs: 0
    };
    return state.staticWorldPerformanceAssessment;
  }

  function getStaticWorldPerformanceAssessmentWindow() {
    return state.staticWorldPerformanceAssessment || resetStaticWorldPerformanceAssessmentWindow('lazy-init');
  }

  function safeRatio(numer, denom) {
    numer = toNumber(numer, 0);
    denom = toNumber(denom, 0);
    return denom > 0 ? numer / denom : 0;
  }

  function classifyStaticWorldOptimizationVerdict(window, current) {
    window = window || {};
    current = current || {};
    var avgFast = safeRatio(window.fastHitDrawWallSum, window.fastHitFrameCount);
    var avgMiss = safeRatio(window.globalMissDrawWallSum, window.globalMissFrameCount);
    var avgChunkAssist = safeRatio(window.chunkAssistGlobalMissDrawWallSum, window.chunkAssistGlobalMissFrameCount);
    var avgNoHit = safeRatio(window.chunkNoHitGlobalMissDrawWallSum, window.chunkNoHitGlobalMissFrameCount);
    var fastHitRate = safeRatio(window.fastHitFrameCount, window.frameCount);
    var globalMissRate = safeRatio(window.globalMissFrameCount, window.frameCount);
    var chunkAssistRateWithinMiss = safeRatio(window.chunkAssistGlobalMissFrameCount, window.globalMissFrameCount);
    if (window.frameCount < 30) return 'warming-up-need-more-frames-before-changing-code';
    if (window.graphicsPacketFrameCount > 0) return 'stop-render-change-visible-graphics-packets-present-investigate-correctness-first';
    if (window.renderTextureMissFrameCount > Math.max(3, window.frameCount * 0.08)) return 'rendertexture-churn-present-do-not-add-plan-cache-yet';
    if (globalMissRate < 0.05 && fastHitRate > 0.9) return 'stable-fast-hit-dominates-next-change-should-be-disabled-or-diagnostic-only';
    if (chunkAssistRateWithinMiss > 0.4 && avgNoHit > 0 && avgChunkAssist > 0 && avgChunkAssist < avgNoHit * 0.85) return 'chunk-cache-helps-miss-frames-next-gate-it-to-global-miss-only';
    if (chunkAssistRateWithinMiss > 0.4) return 'chunk-cache-hits-but-benefit-not-proven-keep-diagnostics-before-optimization';
    if (globalMissRate >= 0.1 && chunkAssistRateWithinMiss < 0.2) return 'global-miss-heavy-but-chunk-cache-not-hitting-diagnose-chunk-key-before-changing-render';
    return 'inconclusive-keep-assessment-only';
  }

  function getRecommendedNextOptimization(window, verdict) {
    verdict = String(verdict || '');
    if (verdict === 'chunk-cache-helps-miss-frames-next-gate-it-to-global-miss-only') return 'O6B-only-run-chunk-level-plan-cache-on-global-stable-plan-miss-and-log-fast-hit-overhead';
    if (verdict === 'global-miss-heavy-but-chunk-cache-not-hitting-diagnose-chunk-key-before-changing-render') return 'diagnose-chunk-plan-key-normalization-before-any-render-change';
    if (verdict.indexOf('rendertexture-churn') >= 0) return 'diagnose-rendertexture-invalidation-first';
    if (verdict.indexOf('visible-graphics') >= 0) return 'fix-correctness-before-performance';
    if (verdict.indexOf('stable-fast-hit') >= 0) return 'do-not-expand-cache-measure-non-static-world-frame-cost';
    return 'no-code-change-until-next-log-confirms-bottleneck';
  }

  function recordStaticWorldPerformanceAssessment(summary, phaseDiag) {
    summary = summary || {};
    phaseDiag = phaseDiag || {};
    var window = getStaticWorldPerformanceAssessmentWindow();
    var drawWallMs = toNumber(summary.drawWallMs, 0);
    var totalBeginFrameMs = toNumber(phaseDiag.totalBeginFrameMs, 0);
    var itemLoopMs = toNumber(phaseDiag.staticPacketItemLoopMs, summary.staticPacketItemBuildMs);
    var staticPacketCount = toNumber(summary.staticPacketCount, phaseDiag.staticPacketCount || 0);
    var actualDrawUnitCount = toNumber(summary.actualDrawUnitCount, 0);
    var fastHit = summary.staticStableItemPlanFastHit === true || phaseDiag.staticStableItemPlanFastHit === true;
    var globalMiss = !fastHit;
    var chunkHitCount = toNumber(summary.staticChunkItemPlanCacheHitCount, phaseDiag.staticChunkItemPlanCacheHitCount || 0);
    var chunkMissCount = toNumber(summary.staticChunkItemPlanCacheMissCount, phaseDiag.staticChunkItemPlanCacheMissCount || 0);
    var chunkHitPacketCount = toNumber(summary.staticChunkItemPlanCacheHitPacketCount, phaseDiag.staticChunkItemPlanCacheHitPacketCount || 0);
    var chunkMissPacketCount = toNumber(summary.staticChunkItemPlanCacheMissPacketCount, phaseDiag.staticChunkItemPlanCacheMissPacketCount || 0);
    var chunkBuiltPacketCount = toNumber(summary.staticChunkItemPlanCacheBuiltPacketCount, phaseDiag.staticChunkItemPlanCacheBuiltPacketCount || 0);
    var chunkAssist = globalMiss && chunkHitCount > 0;
    var chunkNoHit = globalMiss && chunkHitCount <= 0 && chunkMissCount > 0;

    window.frameCount += 1;
    window.lastFrameSeq = state.frameSeq;
    window.drawWallSum += drawWallMs;
    window.totalBeginFrameSum += totalBeginFrameMs;
    window.staticPacketItemLoopSum += itemLoopMs;
    window.staticPacketCountSum += staticPacketCount;
    window.actualDrawUnitCountSum += actualDrawUnitCount;
    window.chunkPlanLookupMsSum += toNumber(summary.staticChunkItemPlanCacheLookupMs, phaseDiag.staticChunkItemPlanCacheLookupMs || 0);
    window.chunkPlanMaterializeMsSum += toNumber(summary.staticChunkItemPlanCacheMaterializeMs, phaseDiag.staticChunkItemPlanCacheMaterializeMs || 0);
    window.chunkPlanHitPacketCountSum += chunkHitPacketCount;
    window.chunkPlanMissPacketCountSum += chunkMissPacketCount;
    window.chunkPlanBuiltPacketCountSum += chunkBuiltPacketCount;
    if (fastHit) {
      window.fastHitFrameCount += 1;
      window.fastHitDrawWallSum += drawWallMs;
      window.fastHitStaticPacketItemLoopSum += itemLoopMs;
    } else {
      window.globalMissFrameCount += 1;
      window.globalMissDrawWallSum += drawWallMs;
      window.globalMissStaticPacketItemLoopSum += itemLoopMs;
    }
    if (chunkAssist) {
      window.chunkAssistGlobalMissFrameCount += 1;
      window.chunkAssistGlobalMissDrawWallSum += drawWallMs;
      window.chunkAssistHitPacketCountSum += chunkHitPacketCount;
    }
    if (chunkNoHit) {
      window.chunkNoHitGlobalMissFrameCount += 1;
      window.chunkNoHitGlobalMissDrawWallSum += drawWallMs;
    }
    if (toNumber(summary.chunkRenderTextureMissCount, 0) > 0 || toNumber(summary.orderRunRenderTextureMissCount, 0) > 0) window.renderTextureMissFrameCount += 1;
    if (toNumber(summary.actualGraphicsPacketDrawCount, 0) > 0) window.graphicsPacketFrameCount += 1;
    if (drawWallMs > window.worstDrawWallMs) {
      window.worstDrawWallMs = drawWallMs;
      window.worstFrameSeq = state.frameSeq;
    }

    var now = nowMs();
    var shouldEmit = window.frameCount === 30 || (window.frameCount % 120) === 0 || drawWallMs >= 80 || (now - toNumber(window.lastEmitAtMs, 0)) >= 6000;
    if (!shouldEmit) return null;
    var verdict = classifyStaticWorldOptimizationVerdict(window, { drawWallMs: drawWallMs });
    var payload = {
      source: 'static-world-performance-assessment',
      step: STEP,
      phase: PHASE,
      assessmentKind: 'rolling-window-no-render-behavior-change',
      frameSeq: state.frameSeq,
      windowFrameCount: window.frameCount,
      windowFirstFrameSeq: window.firstFrameSeq,
      windowLastFrameSeq: window.lastFrameSeq,
      avgDrawWallMs: roundDiag(safeRatio(window.drawWallSum, window.frameCount), 3),
      avgTotalBeginFrameMs: roundDiag(safeRatio(window.totalBeginFrameSum, window.frameCount), 3),
      avgStaticPacketItemLoopMs: roundDiag(safeRatio(window.staticPacketItemLoopSum, window.frameCount), 3),
      avgStaticPacketCount: roundDiag(safeRatio(window.staticPacketCountSum, window.frameCount), 1),
      avgActualDrawUnitCount: roundDiag(safeRatio(window.actualDrawUnitCountSum, window.frameCount), 1),
      fastHitFrameCount: window.fastHitFrameCount,
      fastHitRate: roundDiag(safeRatio(window.fastHitFrameCount, window.frameCount), 4),
      fastHitAvgDrawWallMs: roundDiag(safeRatio(window.fastHitDrawWallSum, window.fastHitFrameCount), 3),
      fastHitAvgStaticPacketItemLoopMs: roundDiag(safeRatio(window.fastHitStaticPacketItemLoopSum, window.fastHitFrameCount), 3),
      globalMissFrameCount: window.globalMissFrameCount,
      globalMissRate: roundDiag(safeRatio(window.globalMissFrameCount, window.frameCount), 4),
      globalMissAvgDrawWallMs: roundDiag(safeRatio(window.globalMissDrawWallSum, window.globalMissFrameCount), 3),
      globalMissAvgStaticPacketItemLoopMs: roundDiag(safeRatio(window.globalMissStaticPacketItemLoopSum, window.globalMissFrameCount), 3),
      chunkAssistGlobalMissFrameCount: window.chunkAssistGlobalMissFrameCount,
      chunkAssistRateWithinGlobalMiss: roundDiag(safeRatio(window.chunkAssistGlobalMissFrameCount, window.globalMissFrameCount), 4),
      chunkAssistGlobalMissAvgDrawWallMs: roundDiag(safeRatio(window.chunkAssistGlobalMissDrawWallSum, window.chunkAssistGlobalMissFrameCount), 3),
      chunkNoHitGlobalMissFrameCount: window.chunkNoHitGlobalMissFrameCount,
      chunkNoHitGlobalMissAvgDrawWallMs: roundDiag(safeRatio(window.chunkNoHitGlobalMissDrawWallSum, window.chunkNoHitGlobalMissFrameCount), 3),
      avgChunkPlanLookupMs: roundDiag(safeRatio(window.chunkPlanLookupMsSum, window.frameCount), 3),
      avgChunkPlanMaterializeMs: roundDiag(safeRatio(window.chunkPlanMaterializeMsSum, window.frameCount), 3),
      avgChunkPlanHitPacketCount: roundDiag(safeRatio(window.chunkPlanHitPacketCountSum, window.frameCount), 1),
      avgChunkPlanMissPacketCount: roundDiag(safeRatio(window.chunkPlanMissPacketCountSum, window.frameCount), 1),
      avgChunkPlanBuiltPacketCount: roundDiag(safeRatio(window.chunkPlanBuiltPacketCountSum, window.frameCount), 1),
      renderTextureMissFrameCount: window.renderTextureMissFrameCount,
      graphicsPacketFrameCount: window.graphicsPacketFrameCount,
      worstDrawWallMs: roundDiag(window.worstDrawWallMs, 3),
      worstFrameSeq: window.worstFrameSeq,
      verdict: verdict,
      recommendedNextOptimization: getRecommendedNextOptimization(window, verdict),
      safeChangePolicy: 'no-render-coordinate-face-merge-order-run-or-singleton-change-without-new-evidence',
      o6aConclusionHint: 'compare-fast-hit-vs-global-miss-and-chunk-assist-before-continuing'
    };
    window.lastEmitAtMs = now;
    window.lastEmitFrameSeq = state.frameSeq;
    emit('static-world-performance-assessment', payload);
    return payload;
  }

  function objectKeyCountForensics(obj) {
    try { return obj ? Object.keys(obj).length : 0; } catch (_) { return 0; }
  }

  function getCacheInventoryForensics() {
    return {
      chunkRenderTextureCacheSize: objectKeyCountForensics(state.chunkRenderTextureCache),
      staticPacketItemBaseCacheSize: objectKeyCountForensics(state.staticPacketItemBaseCache),
      orderRunPlanCacheSize: objectKeyCountForensics(state.orderRunPlanCache),
      chunkEligibilitySplitCacheSize: objectKeyCountForensics(state.chunkEligibilitySplitCache),
      graphicsPoolSize: Array.isArray(state.graphicsPool) ? state.graphicsPool.length : 0,
      chunkSpritePoolSize: Array.isArray(state.chunkSpritePool) ? state.chunkSpritePool.length : 0
    };
  }

  function sampleStaticWorldContainerSprites(container) {
    var out = [];
    try {
      var children = container && Array.isArray(container.children) ? container.children : [];
      for (var i = 0; i < children.length && out.length < 8; i += 1) {
        var child = children[i];
        if (!child || child.visible === false) continue;
        out.push({
          index: i,
          type: child.__pixiStaticWorldOrderRunCache ? 'order-run-rt' : (child.__pixiStaticWorldChunkKey ? 'chunk-rt' : 'graphics'),
          key: child.__pixiStaticWorldChunkKey ? String(child.__pixiStaticWorldChunkKey).slice(0, 96) : '',
          orderIndex: child.__pixiFramePlanOrderIndex != null ? Number(child.__pixiFramePlanOrderIndex) : null,
          x: roundDiag(child.x, 2),
          y: roundDiag(child.y, 2),
          width: roundDiag(child.width, 2),
          height: roundDiag(child.height, 2),
          scaleX: child.scale && child.scale.x != null ? roundDiag(child.scale.x, 4) : null,
          scaleY: child.scale && child.scale.y != null ? roundDiag(child.scale.y, 4) : null,
          zIndex: child.zIndex != null ? Number(child.zIndex) : null,
          transformOnly: child.__pixiStaticWorldChunkTransformOnly === true
        });
      }
    } catch (_) {}
    return out;
  }

  function detectSuspiciousSpritePlacement(samples) {
    samples = Array.isArray(samples) ? samples : [];
    var maxAbsXY = 0;
    var maxWH = 0;
    var suspiciousCount = 0;
    for (var i = 0; i < samples.length; i += 1) {
      var s = samples[i] || {};
      maxAbsXY = Math.max(maxAbsXY, Math.abs(toNumber(s.x, 0)), Math.abs(toNumber(s.y, 0)));
      maxWH = Math.max(maxWH, Math.abs(toNumber(s.width, 0)), Math.abs(toNumber(s.height, 0)));
      if (Math.abs(toNumber(s.x, 0)) > 20000 || Math.abs(toNumber(s.y, 0)) > 20000 || Math.abs(toNumber(s.width, 0)) > 20000 || Math.abs(toNumber(s.height, 0)) > 20000) suspiciousCount += 1;
    }
    return { suspiciousSpritePlacementCount: suspiciousCount, sampleMaxAbsXY: roundDiag(maxAbsXY, 2), sampleMaxWidthHeight: roundDiag(maxWH, 2) };
  }

  function classifyStaticWorldBottleneck(summary, phaseDiag) {
    summary = summary || {};
    phaseDiag = phaseDiag || {};
    var candidates = [
      ['staticPacketItemLoopMs', toNumber(phaseDiag.staticPacketItemLoopMs, summary.staticPacketItemBuildMs)],
      ['chunkRenderTextureFrameMs', toNumber(phaseDiag.chunkRenderTextureFrameMs, summary.chunkRenderTextureWallMs)],
      ['orderRunRenderTextureFrameMs', toNumber(phaseDiag.orderRunRenderTextureFrameMs, summary.orderRunRenderTextureWallMs)],
      ['playerSensitiveGraphicsDrawMs', toNumber(summary.playerSensitiveGraphicsDrawMs, phaseDiag.persistentGraphicsMs)],
      ['containerSortMs', toNumber(summary.containerSortMs, phaseDiag.containerSortMs)],
      ['orderRunDiagnosticsBuildMs', toNumber(summary.orderRunDiagnosticsBuildMs, phaseDiag.orderRunDiagnosticsBuildMs)],
      ['chunkEligibilitySplitMs', toNumber(summary.chunkEligibilitySplitMs, phaseDiag.chunkEligibilitySplitMs)],
      ['staticPacketDrawDataLookupMs', toNumber(summary.staticPacketDrawDataLookupMs, 0)],
      ['staticPacketProjectionLookupMs', toNumber(summary.staticPacketProjectionLookupMs, 0)],
      ['cachePruneMs', toNumber(summary.staticPacketItemBaseCachePruneMs, 0)]
    ];
    candidates.sort(function (a, b) { return b[1] - a[1]; });
    var top = candidates[0] || ['unknown', 0];
    return { primaryBottleneck: top[0], primaryBottleneckMs: roundDiag(top[1], 3), topBottlenecks: candidates.slice(0, 4).map(function (x) { return { name: x[0], ms: roundDiag(x[1], 3) }; }) };
  }

  function emitStaticWorldForensics(summary, phaseDiag, container) {
    summary = summary || {};
    phaseDiag = phaseDiag || {};
    var bottleneck = classifyStaticWorldBottleneck(summary, phaseDiag);
    var cacheInventory = getCacheInventoryForensics();
    var spriteSamples = sampleStaticWorldContainerSprites(container);
    var placement = detectSuspiciousSpritePlacement(spriteSamples);
    var payload = Object.assign({
      source: 'pixi-static-world-forensics',
      step: STEP,
      frameSeq: summary.frameSeq,
      framePlanId: summary.framePlanId || '',
      staticPacketCount: toNumber(summary.staticPacketCount, 0),
      packetDrawCount: toNumber(summary.packetDrawCount, 0),
      actualDrawUnitCount: toNumber(summary.actualDrawUnitCount, 0),
      actualCacheSpriteDrawCount: toNumber(summary.actualCacheSpriteDrawCount, 0),
      actualGraphicsPacketDrawCount: toNumber(summary.actualGraphicsPacketDrawCount, 0),
      drawWallMs: roundDiag(summary.drawWallMs, 3),
      primaryBottleneck: bottleneck.primaryBottleneck,
      primaryBottleneckMs: bottleneck.primaryBottleneckMs,
      topBottlenecks: bottleneck.topBottlenecks,
      staticWorldFrameAssessment: (summary.staticStableItemPlanFastHit === true) ? 'global-fast-hit-frame' : ((toNumber(summary.staticChunkItemPlanCacheHitCount, phaseDiag.staticChunkItemPlanCacheHitCount || 0) > 0) ? 'global-miss-with-chunk-cache-assist' : 'global-miss-without-chunk-cache-assist'),
      staticWorldFrameSafeNextStep: 'assessment-only-do-not-change-render-path-from-this-line-alone',
      staticPacketItemCacheHitRate: roundDiag(summary.staticPacketItemCacheHitRate, 4),
      staticChunkItemPlanCacheEnabled: summary.staticChunkItemPlanCacheEnabled === true || phaseDiag.staticChunkItemPlanCacheEnabled === true,
      staticChunkItemPlanCacheHitCount: toNumber(summary.staticChunkItemPlanCacheHitCount, phaseDiag.staticChunkItemPlanCacheHitCount || 0),
      staticChunkItemPlanCacheMissCount: toNumber(summary.staticChunkItemPlanCacheMissCount, phaseDiag.staticChunkItemPlanCacheMissCount || 0),
      staticChunkItemPlanCacheHitRate: roundDiag(summary.staticChunkItemPlanCacheHitRate != null ? summary.staticChunkItemPlanCacheHitRate : phaseDiag.staticChunkItemPlanCacheHitRate, 4),
      staticChunkItemPlanCacheHitPacketCount: toNumber(summary.staticChunkItemPlanCacheHitPacketCount, phaseDiag.staticChunkItemPlanCacheHitPacketCount || 0),
      staticChunkItemPlanCacheMissPacketCount: toNumber(summary.staticChunkItemPlanCacheMissPacketCount, phaseDiag.staticChunkItemPlanCacheMissPacketCount || 0),
      staticChunkItemPlanCacheBuiltPacketCount: toNumber(summary.staticChunkItemPlanCacheBuiltPacketCount, phaseDiag.staticChunkItemPlanCacheBuiltPacketCount || 0),
      staticChunkItemPlanCacheLookupMs: roundDiag(summary.staticChunkItemPlanCacheLookupMs != null ? summary.staticChunkItemPlanCacheLookupMs : phaseDiag.staticChunkItemPlanCacheLookupMs, 3),
      staticChunkItemPlanCacheMaterializeMs: roundDiag(summary.staticChunkItemPlanCacheMaterializeMs != null ? summary.staticChunkItemPlanCacheMaterializeMs : phaseDiag.staticChunkItemPlanCacheMaterializeMs, 3),
      staticChunkItemPlanCacheSize: toNumber(summary.staticChunkItemPlanCacheSize, phaseDiag.staticChunkItemPlanCacheSize || 0),
      staticStableItemPlanCacheGate: summary.staticStableItemPlanCacheGate || phaseDiag.staticStableItemPlanCacheGate || '',
      staticStableItemPlanCacheBlockedBy: summary.staticStableItemPlanCacheBlockedBy || phaseDiag.staticStableItemPlanCacheBlockedBy || '',
      staticStableItemPlanCacheGateMode: summary.staticStableItemPlanCacheGateMode || phaseDiag.staticStableItemPlanCacheGateMode || '',
      pixiPerformanceModeEnabled: summary.pixiPerformanceModeEnabled === true || phaseDiag.pixiPerformanceModeEnabled === true,
      verboseStaticDiagnosticsEnabled: summary.verboseStaticDiagnosticsEnabled === true || phaseDiag.verboseStaticDiagnosticsEnabled === true,
      chunkInputDiagnosticsSuppressedForStablePlan: summary.chunkInputDiagnosticsSuppressedForStablePlan === true || phaseDiag.chunkInputDiagnosticsSuppressedForStablePlan === true,
      stableItemPlanCacheRequiresPerformanceMode: summary.stableItemPlanCacheRequiresPerformanceMode === true || phaseDiag.stableItemPlanCacheRequiresPerformanceMode === true,
      staticStableItemPlanFastHitEnabled: summary.staticStableItemPlanFastHitEnabled === true,
      staticStableItemPlanFastHit: summary.staticStableItemPlanFastHit === true,
      staticStableItemPlanFastHitReason: summary.staticStableItemPlanFastHitReason || '',
      staticStableItemPlanFastItemCount: toNumber(summary.staticStableItemPlanFastItemCount, 0),
      staticStableItemPlanFastSplitHit: summary.staticStableItemPlanFastSplitHit === true,
      staticMaterializedPlanExactCacheHit: summary.staticMaterializedPlanExactCacheHit === true || phaseDiag.staticMaterializedPlanExactCacheHit === true,
      staticStableItemPlanContentSetHit: summary.staticStableItemPlanContentSetHit === true || phaseDiag.staticStableItemPlanContentSetHit === true,
      staticStableItemPlanContentSetReason: summary.staticStableItemPlanContentSetReason || phaseDiag.staticStableItemPlanContentSetReason || '',
      staticStableItemPlanContentSetKeyHash: summary.staticStableItemPlanContentSetKeyHash || phaseDiag.staticStableItemPlanContentSetKeyHash || '',
      stablePlanKeyDiffReason: summary.stablePlanKeyDiffReason || phaseDiag.stablePlanKeyDiffReason || '',
      stablePlanKeyMissComparedTo: summary.stablePlanKeyMissComparedTo || phaseDiag.stablePlanKeyMissComparedTo || '',
      stablePlanKeyDiffFieldCount: toNumber(summary.stablePlanKeyDiffFieldCount, phaseDiag.stablePlanKeyDiffFieldCount || 0),
      stablePlanKeyDiffFields: summary.stablePlanKeyDiffFields || phaseDiag.stablePlanKeyDiffFields || '',
      stablePlanKeyDiffTop: summary.stablePlanKeyDiffTop || phaseDiag.stablePlanKeyDiffTop || '',
      stablePlanKeyChangedFromPrevious: summary.stablePlanKeyChangedFromPrevious === true || phaseDiag.stablePlanKeyChangedFromPrevious === true,
      stablePlanKeyNearestCacheHit: summary.stablePlanKeyNearestCacheHit === true || phaseDiag.stablePlanKeyNearestCacheHit === true,
      stablePlanKeyNearestCacheDiffFieldCount: toNumber(summary.stablePlanKeyNearestCacheDiffFieldCount, phaseDiag.stablePlanKeyNearestCacheDiffFieldCount || 0),
      stablePlanKeyNearestCacheDiffTop: summary.stablePlanKeyNearestCacheDiffTop || phaseDiag.stablePlanKeyNearestCacheDiffTop || '',
      stablePlanKeyCurrentHash: summary.stablePlanKeyCurrentHash || phaseDiag.stablePlanKeyCurrentHash || '',
      stablePlanKeyPreviousHash: summary.stablePlanKeyPreviousHash || phaseDiag.stablePlanKeyPreviousHash || '',
      stablePlanKeyNearestCacheHash: summary.stablePlanKeyNearestCacheHash || phaseDiag.stablePlanKeyNearestCacheHash || '',
      stablePlanKeyCurrentContentHash: summary.stablePlanKeyCurrentContentHash || phaseDiag.stablePlanKeyCurrentContentHash || '',
      stablePlanKeyPreviousContentHash: summary.stablePlanKeyPreviousContentHash || phaseDiag.stablePlanKeyPreviousContentHash || '',
      stablePlanKeyContentHashChanged: summary.stablePlanKeyContentHashChanged === true || phaseDiag.stablePlanKeyContentHashChanged === true,
      stablePlanKeyRunsHashChanged: summary.stablePlanKeyRunsHashChanged === true || phaseDiag.stablePlanKeyRunsHashChanged === true,
      stablePlanKeyStaticSharedTexVerChanged: summary.stablePlanKeyStaticSharedTexVerChanged === true || phaseDiag.stablePlanKeyStaticSharedTexVerChanged === true,
      stablePlanKeyFloorBuildCameraChanged: summary.stablePlanKeyFloorBuildCameraChanged === true || phaseDiag.stablePlanKeyFloorBuildCameraChanged === true,
      stablePlanKeyFloorSurfaceRevisionChanged: summary.stablePlanKeyFloorSurfaceRevisionChanged === true || phaseDiag.stablePlanKeyFloorSurfaceRevisionChanged === true,
      stablePlanKeyFaceMergeChanged: summary.stablePlanKeyFaceMergeChanged === true || phaseDiag.stablePlanKeyFaceMergeChanged === true,
      stablePlanKeyCurrentCameraChanged: summary.stablePlanKeyCurrentCameraChanged === true || phaseDiag.stablePlanKeyCurrentCameraChanged === true,
      staticChunkDrawDataCacheHitRate: roundDiag(summary.staticChunkDrawDataCacheHitRate, 4),
      chunkEligibilitySplitCacheHitRate: roundDiag(summary.chunkEligibilitySplitCacheHitRate, 4),
      projectedGeometryCacheHitRate: (toNumber(summary.projectedGeometryCacheHitCount, 0) + toNumber(summary.projectedGeometryCacheMissCount, 0)) ? roundDiag(toNumber(summary.projectedGeometryCacheHitCount, 0) / (toNumber(summary.projectedGeometryCacheHitCount, 0) + toNumber(summary.projectedGeometryCacheMissCount, 0)), 4) : 0,
      chunkRenderTextureHitRate: roundDiag(summary.chunkRenderTextureHitRate, 4),
      chunkRenderTextureCount: toNumber(summary.chunkRenderTextureCount, 0),
      chunkRenderTextureMissCount: toNumber(summary.chunkRenderTextureMissCount, 0),
      chunkRenderTextureUploadCount: toNumber(summary.chunkRenderTextureUploadCount, 0),
      chunkRenderTextureCreateCount: toNumber(summary.chunkRenderTextureCreateCount, 0),
      chunkRenderTextureDestroyCount: toNumber(summary.chunkRenderTextureDestroyCount, 0),
      chunkRenderTextureWallMs: roundDiag(summary.chunkRenderTextureWallMs, 3),
      chunkRenderTextureGroupBuildMs: roundDiag(summary.chunkRenderTextureGroupBuildMs, 3),
      chunkRenderTextureSignatureBuildMs: roundDiag(summary.chunkRenderTextureSignatureBuildMs, 3),
      chunkRenderTextureCommandDrawMs: roundDiag(summary.chunkRenderTextureCommandDrawMs, 3),
      chunkRenderTextureRenderToTextureMs: roundDiag(summary.chunkRenderTextureRenderToTextureMs, 3),
      chunkRenderTextureSpriteApplyMs: roundDiag(summary.chunkRenderTextureSpriteApplyMs, 3),
      orderRunCacheActive: summary.orderRunCacheActive === true,
      orderRunGraphicsItemsReboundToCurrentFrame: summary.orderRunGraphicsItemsReboundToCurrentFrame === true,
      orderRunGraphicsItemsReboundCount: toNumber(summary.orderRunGraphicsItemsReboundCount, 0),
      orderRunGraphicsItemsRebindMissingCount: toNumber(summary.orderRunGraphicsItemsRebindMissingCount, 0),
      orderRunPlanCacheHitRate: roundDiag(summary.orderRunPlanCacheHitRate, 4),
      orderRunRenderTextureHitRate: roundDiag(summary.orderRunRenderTextureHitRate, 4),
      orderRunRenderTextureMissCount: toNumber(summary.orderRunRenderTextureMissCount, 0),
      orderRunRenderTextureUploadCount: toNumber(summary.orderRunRenderTextureUploadCount, 0),
      orderRunRenderTextureCommandDrawMs: roundDiag(summary.orderRunRenderTextureCommandDrawMs, 3),
      orderRunRenderTextureRenderToTextureMs: roundDiag(summary.orderRunRenderTextureRenderToTextureMs, 3),
      playerSensitiveGraphicsDrawMs: roundDiag(summary.playerSensitiveGraphicsDrawMs, 3),
      containerSortMs: roundDiag(summary.containerSortMs, 3),
      staticUsesSharedFloorReuseTransform: summary.staticUsesSharedFloorReuseTransform === true,
      staticSharedFloorReuseScale: summary.staticSharedFloorReuseScale != null ? roundDiag(summary.staticSharedFloorReuseScale, 4) : null,
      staticFloorAlignmentMaxAbsError: summary.staticFloorAlignmentMaxAbsError != null ? roundDiag(summary.staticFloorAlignmentMaxAbsError, 4) : null,
      staticProjectionCameraX: summary.staticProjectionCameraX != null ? roundDiag(summary.staticProjectionCameraX, 3) : null,
      staticProjectionCameraY: summary.staticProjectionCameraY != null ? roundDiag(summary.staticProjectionCameraY, 3) : null,
      floorBuildCameraXAtStaticProjection: summary.floorBuildCameraXAtStaticProjection != null ? roundDiag(summary.floorBuildCameraXAtStaticProjection, 3) : null,
      floorBuildCameraYAtStaticProjection: summary.floorBuildCameraYAtStaticProjection != null ? roundDiag(summary.floorBuildCameraYAtStaticProjection, 3) : null,
      cacheMissStorm: (toNumber(summary.chunkRenderTextureCount, 0) > 0 && roundDiag(summary.chunkRenderTextureHitRate, 4) < 0.85) || toNumber(summary.staticPacketDrawDataBuildCount, 0) > 0,
      renderTextureChurn: toNumber(summary.chunkRenderTextureUploadCount, 0) > 0 || toNumber(summary.orderRunRenderTextureUploadCount, 0) > 0,
      tooManyDrawUnits: toNumber(summary.actualDrawUnitCount, 0) > 256,
      staticCanvasFallbackShouldBeZero: summary.canvas2dSkipsStaticWorldPackets === true,
      cacheInventory: cacheInventory,
      spriteSamples: spriteSamples
    }, placement);
    var signature = '';
    try {
      signature = JSON.stringify({
        plan: payload.framePlanId,
        wallBucket: Math.floor(toNumber(payload.drawWallMs, 0) / 4),
        bottleneck: payload.primaryBottleneck,
        chunkHitRate: payload.chunkRenderTextureHitRate,
        chunkMiss: payload.chunkRenderTextureMissCount,
        orderMiss: payload.orderRunRenderTextureMissCount,
        drawUnits: payload.actualDrawUnitCount,
        suspicious: payload.suspiciousSpritePlacementCount
      });
    } catch (_) { signature = String(payload.frameSeq || 0) + '|' + String(payload.drawWallMs || 0); }
    var t = nowMs();
    var force = toNumber(payload.drawWallMs, 0) >= 12 || payload.cacheMissStorm || payload.renderTextureChurn || payload.suspiciousSpritePlacementCount > 0 || payload.tooManyDrawUnits;
    if (!force && signature === state.lastStaticWorldForensicsSignature && (t - Number(state.lastStaticWorldForensicsEmitAt || 0)) < 1200) return;
    state.lastStaticWorldForensicsSignature = signature;
    state.lastStaticWorldForensicsEmitAt = t;
    emit('forensics-static-world', payload);
  }

  function getVerboseChunkDepthDiagnosticsEnabled() {
    try {
      if (global.localStorage && global.localStorage.getItem('pixiChunkOcclusionVerbose') === '1') return true;
    } catch (_) {}
    try {
      if (global.__PIXI_CHUNK_OCCLUSION_VERBOSE__ === true) return true;
    } catch (_) {}
    return false;
  }

  function packetDepthDiagnostic(packet, orderIndex) {
    packet = packet || {};
    return {
      id: packet.id ? String(packet.id) : '',
      orderIndex: Number.isFinite(Number(orderIndex)) ? Number(orderIndex) : null,
      sortKey: roundDiag(packet.sortKey, 3),
      tie: roundDiag(packet.tie, 3),
      depthKey: roundDiag(packet.depthKey, 3),
      face: packet.semanticFace ? String(packet.semanticFace) : '',
      screenFace: packet.screenFace ? String(packet.screenFace) : '',
      cell: [toNumber(packet.cellX, 0), toNumber(packet.cellY, 0), toNumber(packet.cellZ, 0)].join(','),
      merged: packet.mergedFace === true,
      mergedFaceCount: toNumber(packet.mergedFaceCount, 1),
      chunkKey: getPacketChunkKey(packet),
      stableDepthBand: getPacketStableDepthBand(packet)
    };
  }

  function buildChunkDepthDiagnostics(groups) {
    groups = Array.isArray(groups) ? groups : [];
    var maxOrderSpan = 0;
    var maxSortSpan = 0;
    var maxDepthSpan = 0;
    var maxCellZSpan = 0;
    var riskGroupCount = 0;
    var top = groups.slice().sort(function (a, b) {
      var ao = Math.max(0, toNumber(a && a.maxOrderIndex, 0) - toNumber(a && a.minOrderIndex, 0));
      var bo = Math.max(0, toNumber(b && b.maxOrderIndex, 0) - toNumber(b && b.minOrderIndex, 0));
      if (bo !== ao) return bo - ao;
      return toNumber(b && b.packetCount, 0) - toNumber(a && a.packetCount, 0);
    }).slice(0, getVerboseChunkDepthDiagnosticsEnabled() ? 12 : 5).map(function (g) {
      var orderSpan = Math.max(0, toNumber(g && g.maxOrderIndex, 0) - toNumber(g && g.minOrderIndex, 0));
      var sortSpan = Math.max(0, toNumber(g && g.maxSortKey, 0) - toNumber(g && g.minSortKey, 0));
      var depthSpan = Math.max(0, toNumber(g && g.maxDepthKey, 0) - toNumber(g && g.minDepthKey, 0));
      var cellZSpan = Math.max(0, toNumber(g && g.maxCellZ, 0) - toNumber(g && g.minCellZ, 0));
      maxOrderSpan = Math.max(maxOrderSpan, orderSpan);
      maxSortSpan = Math.max(maxSortSpan, sortSpan);
      maxDepthSpan = Math.max(maxDepthSpan, depthSpan);
      maxCellZSpan = Math.max(maxCellZSpan, cellZSpan);
      var risk = orderSpan > 64 || depthSpan > 3 || cellZSpan > 3 || sortSpan > 64;
      if (risk) riskGroupCount += 1;
      return {
        chunkKey: g && g.chunkKey ? String(g.chunkKey) : '',
        stableDepthBand: g && g.stableDepthBand ? String(g.stableDepthBand) : '',
        packetCount: toNumber(g && g.packetCount, 0),
        minOrderIndex: Number.isFinite(Number(g && g.minOrderIndex)) ? Number(g.minOrderIndex) : null,
        maxOrderIndex: Number.isFinite(Number(g && g.maxOrderIndex)) ? Number(g.maxOrderIndex) : null,
        orderSpan: orderSpan,
        minSortKey: roundDiag(g && g.minSortKey, 3),
        maxSortKey: roundDiag(g && g.maxSortKey, 3),
        sortSpan: roundDiag(sortSpan, 3),
        minDepthKey: roundDiag(g && g.minDepthKey, 3),
        maxDepthKey: roundDiag(g && g.maxDepthKey, 3),
        depthSpan: roundDiag(depthSpan, 3),
        minCellZ: roundDiag(g && g.minCellZ, 3),
        maxCellZ: roundDiag(g && g.maxCellZ, 3),
        cellZSpan: roundDiag(cellZSpan, 3),
        mergedFaceCount: toNumber(g && g.mergedFaceCount, 0),
        unmergedFaceCount: toNumber(g && g.unmergedFaceCount, 0),
        faceCounts: g && g.faceCounts ? g.faceCounts : {},
        sampleFirst: g && g.sampleFirst ? g.sampleFirst : [],
        sampleLast: g && g.sampleLast ? g.sampleLast : [],
        risk: risk
      };
    });
    // Need compute max/risk for all groups, not just top list.
    for (var i = 0; i < groups.length; i += 1) {
      var g = groups[i];
      var os = Math.max(0, toNumber(g && g.maxOrderIndex, 0) - toNumber(g && g.minOrderIndex, 0));
      var ss = Math.max(0, toNumber(g && g.maxSortKey, 0) - toNumber(g && g.minSortKey, 0));
      var ds = Math.max(0, toNumber(g && g.maxDepthKey, 0) - toNumber(g && g.minDepthKey, 0));
      var zs = Math.max(0, toNumber(g && g.maxCellZ, 0) - toNumber(g && g.minCellZ, 0));
      maxOrderSpan = Math.max(maxOrderSpan, os);
      maxSortSpan = Math.max(maxSortSpan, ss);
      maxDepthSpan = Math.max(maxDepthSpan, ds);
      maxCellZSpan = Math.max(maxCellZSpan, zs);
      if (os > 64 || ds > 3 || zs > 3 || ss > 64) riskGroupCount += 1;
    }
    return {
      maxOrderSpan: roundDiag(maxOrderSpan, 3),
      maxSortSpan: roundDiag(maxSortSpan, 3),
      maxDepthSpan: roundDiag(maxDepthSpan, 3),
      maxCellZSpan: roundDiag(maxCellZSpan, 3),
      riskGroupCount: riskGroupCount,
      groupCount: groups.length,
      topGroups: top
    };
  }

  function buildChunkTextureSignature(group) {
    var parts = [
      'chunk-rt-v=07.18K1-chunk-key-only-strict',
      'chunk=' + String(group.chunkKey),
      // PXM-07.18K1: external chunk texture content is cached by raw
      // chunkKey only. Player/dynamic-sensitive chunks are excluded earlier
      // and handled by order-run cache; stableDepthBand grouping is prohibited
      // in Pixi strict mode because it fragments large scenes into thousands
      // of sprites.
      'mode=' + getExternalChunkCacheGroupingMode(),
      'packets=' + String(group.packetCount),
      'bounds=' + safeRoundForSignature(group.bounds.minX, 2) + ',' + safeRoundForSignature(group.bounds.minY, 2) + ',' + safeRoundForSignature(group.bounds.maxX, 2) + ',' + safeRoundForSignature(group.bounds.maxY, 2)
    ];
    for (var i = 0; i < group.packetSignatures.length; i += 1) parts.push(group.packetSignatures[i]);
    return parts.join('|');
  }

  function buildChunkGroups(items) {
    var groupsByKey = Object.create(null);
    var groups = [];
    var heavyDiagnostics = shouldCollectHeavyStaticDiagnostics();
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      var key = getChunkRenderKey(item.packet, item.runStartIndex);
      var group = groupsByKey[key];
      if (!group) {
        group = groupsByKey[key] = {
          chunkKey: key,
          chunkCacheGroupingMode: getExternalChunkCacheGroupingMode(),
          stableDepthBand: item && item.packet ? getPacketStableDepthBand(item.packet) : 'band:unknown',
          runStartIndex: item.runStartIndex,
          minOrderIndex: Infinity,
          maxOrderIndex: -Infinity,
          packetCount: 0,
          packetSignatures: [],
          commands: [],
          bounds: createEmptyBounds(),
          samplePacketIds: [],
          sampleFirst: [],
          sampleLast: [],
          faceCounts: Object.create(null),
          mergedFaceCount: 0,
          unmergedFaceCount: 0,
          minSortKey: Infinity,
          maxSortKey: -Infinity,
          minDepthKey: Infinity,
          maxDepthKey: -Infinity,
          minCellZ: Infinity,
          maxCellZ: -Infinity
        };
        groups.push(group);
      }
      group.packetCount += 1;
      group.minOrderIndex = Math.min(group.minOrderIndex, item.orderIndex);
      group.maxOrderIndex = Math.max(group.maxOrderIndex, item.orderIndex);
      group.packetSignatures.push(item.chunkTextureSignature || item.renderSignature || 'packet:' + String(item.packet && item.packet.id || i));
      if (group.samplePacketIds.length < 4) group.samplePacketIds.push(String(item.packet && item.packet.id || ''));
      group.minSortKey = Math.min(group.minSortKey, toNumber(item.packet && item.packet.sortKey, 0));
      group.maxSortKey = Math.max(group.maxSortKey, toNumber(item.packet && item.packet.sortKey, 0));
      group.minDepthKey = Math.min(group.minDepthKey, toNumber(item.packet && item.packet.depthKey, 0));
      group.maxDepthKey = Math.max(group.maxDepthKey, toNumber(item.packet && item.packet.depthKey, 0));
      group.minCellZ = Math.min(group.minCellZ, toNumber(item.packet && item.packet.cellZ, 0));
      group.maxCellZ = Math.max(group.maxCellZ, toNumber(item.packet && item.packet.cellZ, 0));
      if (item.packet && item.packet.mergedFace === true) group.mergedFaceCount += 1; else group.unmergedFaceCount += 1;
      if (heavyDiagnostics) {
        countObjectKey(group.faceCounts, item.packet && item.packet.semanticFace);
        var packetDiag = packetDepthDiagnostic(item.packet, item.orderIndex);
        if (group.sampleFirst.length < 6) group.sampleFirst.push(packetDiag);
        group.sampleLast.push(packetDiag);
        if (group.sampleLast.length > 6) group.sampleLast.shift();
      }
      var drawData = item.drawData || null;
      if (drawData && Array.isArray(drawData.commands)) {
        for (var c = 0; c < drawData.commands.length; c += 1) group.commands.push(drawData.commands[c]);
        expandBoundsWithPoint(group.bounds, { x: drawData.bounds.minX, y: drawData.bounds.minY });
        expandBoundsWithPoint(group.bounds, { x: drawData.bounds.maxX, y: drawData.bounds.maxY });
      }
    }
    groups.sort(function (a, b) { return a.minOrderIndex - b.minOrderIndex; });
    return groups;
  }

  function objectKeyCount(map) {
    try { return map ? Object.keys(map).length : 0; } catch (_) { return 0; }
  }

  function buildOptimizationPlacementAudit(allItems, chunkEligibilitySplit, chunkRenderTextureSummary, orderRunRenderTextureSummary, orderRunDiagnosticsSummary, playerSensitiveDraw) {
    var all = Array.isArray(allItems) ? allItems : [];
    var split = chunkEligibilitySplit || {};
    var externalItems = Array.isArray(split.chunkItems) ? split.chunkItems : [];
    var sensitiveItems = Array.isArray(split.playerSensitiveItems) ? split.playerSensitiveItems : [];
    var allChunks = Object.create(null);
    var externalChunks = Object.create(null);
    var sensitiveChunks = Object.create(null);
    var externalGroupKeys = Object.create(null);
    var externalLegacyStableBandGroupKeys = Object.create(null);
    var externalChunkGroupKeys = Object.create(null);
    var externalChunkBandKeys = Object.create(null);
    var externalChunkPacketCounts = Object.create(null);
    var chunkKeyOnlyWouldCoverPackets = 0;

    function ensureBucket(map, key) {
      key = key || 'chunk:unknown';
      if (!map[key]) map[key] = Object.create(null);
      return map[key];
    }
    function addUnique(map, key, value) {
      key = key || 'chunk:unknown';
      var bucket = ensureBucket(map, key);
      bucket[String(value || '')] = true;
    }
    function addCount(map, key, delta) {
      key = key || 'chunk:unknown';
      map[key] = Number(map[key] || 0) + Number(delta || 1);
    }

    for (var i = 0; i < all.length; i += 1) {
      var item = all[i];
      var chunk = getPacketChunkKey(item && item.packet) || 'chunk:unknown';
      allChunks[chunk] = true;
    }
    for (var e = 0; e < externalItems.length; e += 1) {
      var ext = externalItems[e];
      var packet = ext && ext.packet;
      var rawChunk = getPacketChunkKey(packet) || 'chunk:unknown';
      var renderKey = getChunkRenderKey(packet, ext && ext.runStartIndex);
      var band = getPacketStableDepthBand(packet);
      externalChunks[rawChunk] = true;
      externalGroupKeys[renderKey] = true;
      externalLegacyStableBandGroupKeys[rawChunk + '|band=' + band] = true;
      addUnique(externalChunkGroupKeys, rawChunk, renderKey);
      addUnique(externalChunkBandKeys, rawChunk, band);
      addCount(externalChunkPacketCounts, rawChunk, 1);
      chunkKeyOnlyWouldCoverPackets += 1;
    }
    for (var sidx = 0; sidx < sensitiveItems.length; sidx += 1) {
      var sens = sensitiveItems[sidx];
      var sensChunk = getPacketChunkKey(sens && sens.packet) || 'chunk:unknown';
      sensitiveChunks[sensChunk] = true;
    }

    var topFragmentedChunks = [];
    var chunkKeys = Object.keys(externalChunkPacketCounts);
    var maxGroupsPerChunk = 0;
    var overFragmentedChunkCount = 0;
    for (var ck = 0; ck < chunkKeys.length; ck += 1) {
      var key = chunkKeys[ck];
      var groupCount = objectKeyCount(externalChunkGroupKeys[key]);
      var bandCount = objectKeyCount(externalChunkBandKeys[key]);
      var packetCount = Number(externalChunkPacketCounts[key] || 0);
      maxGroupsPerChunk = Math.max(maxGroupsPerChunk, groupCount);
      if (groupCount > 8 || (packetCount > 0 && groupCount / Math.max(1, packetCount) > 0.25)) overFragmentedChunkCount += 1;
      var sampleBands = [];
      try { sampleBands = Object.keys(externalChunkBandKeys[key] || {}).slice(0, 8); } catch (_) { sampleBands = []; }
      topFragmentedChunks.push({
        chunkKey: key,
        packetCount: packetCount,
        chunkCacheGroupCount: groupCount,
        stableDepthBandCount: bandCount,
        avgPacketsPerGroup: groupCount ? Number((packetCount / groupCount).toFixed(3)) : packetCount,
        fragmentationRatio: packetCount ? Number((groupCount / packetCount).toFixed(4)) : 0,
        sampleBands: sampleBands
      });
    }
    topFragmentedChunks.sort(function (a, b) {
      if (b.chunkCacheGroupCount !== a.chunkCacheGroupCount) return b.chunkCacheGroupCount - a.chunkCacheGroupCount;
      return b.packetCount - a.packetCount;
    });
    topFragmentedChunks = topFragmentedChunks.slice(0, 10);

    var chunkKeyOnlyGroupCount = objectKeyCount(externalChunks);
    var stableDepthBandGroupCount = objectKeyCount(externalLegacyStableBandGroupKeys);
    var chunkKeyOnlyActualGroupCount = objectKeyCount(externalGroupKeys);
    var actualChunkSprites = chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0) : chunkKeyOnlyActualGroupCount;
    var actualOrderRunSprites = orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? toNumber(orderRunRenderTextureSummary.orderRunRenderTextureCount, 0) : 0;
    var actualGraphicsPackets = playerSensitiveDraw && playerSensitiveDraw.packetDrawCount != null ? toNumber(playerSensitiveDraw.packetDrawCount, 0) : 0;
    var visibleChunkCount = objectKeyCount(allChunks);
    var idealNonSensitiveChunkSpriteCount = chunkKeyOnlyGroupCount;
    var actualDrawUnits = actualChunkSprites + actualOrderRunSprites + actualGraphicsPackets;
    var drawUnitOverIdealRatio = idealNonSensitiveChunkSpriteCount ? Number((actualChunkSprites / idealNonSensitiveChunkSpriteCount).toFixed(3)) : actualChunkSprites;
    var verdict = 'unknown';
    if (stableDepthBandGroupCount > chunkKeyOnlyGroupCount * 8 && stableDepthBandGroupCount > 128) verdict = 'chunk-cache-over-fragmented-by-stable-depth-band';
    else if (actualDrawUnits > 512) verdict = 'too-many-pixi-static-draw-units';
    else verdict = 'chunk-cache-granularity-acceptable';

    return {
      step: STEP,
      phase: PHASE,
      source: 'pixi-static-world-consumer.optimization-placement-audit',
      visibleStaticPacketCount: all.length,
      visibleChunkCount: visibleChunkCount,
      externalChunkCacheEligiblePacketCount: externalItems.length,
      playerSensitivePacketCount: sensitiveItems.length,
      playerSensitiveChunkCount: objectKeyCount(sensitiveChunks),
      chunkKeyOnlyGroupCount: chunkKeyOnlyGroupCount,
      chunkKeyOnlyActualGroupCount: chunkKeyOnlyActualGroupCount,
      stableDepthBandGroupCount: stableDepthBandGroupCount,
      legacyStableDepthBandWouldGroupCount: stableDepthBandGroupCount,
      stableDepthBandFragmentationFactor: chunkKeyOnlyGroupCount ? Number((stableDepthBandGroupCount / chunkKeyOnlyGroupCount).toFixed(3)) : stableDepthBandGroupCount,
      strictExternalChunkGroupingMode: getExternalChunkCacheGroupingMode(),
      stableDepthBandPathUsedInPixiStrictMode: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureStableDepthBandPathUsed === true),
      chunkRenderTextureActualSpriteCount: actualChunkSprites,
      orderRunRenderTextureActualSpriteCount: actualOrderRunSprites,
      graphicsPacketActualCount: actualGraphicsPackets,
      actualStaticDrawUnitCount: actualDrawUnits,
      idealNonSensitiveChunkSpriteCount: idealNonSensitiveChunkSpriteCount,
      estimatedExcessChunkSpritesFromBanding: Math.max(0, stableDepthBandGroupCount - chunkKeyOnlyGroupCount),
      drawUnitOverIdealChunkRatio: drawUnitOverIdealRatio,
      overFragmentedChunkCount: overFragmentedChunkCount,
      maxGroupsPerChunk: maxGroupsPerChunk,
      chunkRenderTextureExternalChunksUseStableDepthBands: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureExternalChunksUseStableDepthBands === true),
      chunkRenderTextureExternalChunkGroupingMode: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureExternalChunkGroupingMode ? String(chunkRenderTextureSummary.chunkRenderTextureExternalChunkGroupingMode) : getExternalChunkCacheGroupingMode(),
      chunkRenderTextureStableDepthBandPathUsed: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureStableDepthBandPathUsed === true),
      chunkRenderTextureStableDepthBandBucketSize: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureStableDepthBandBucketSize != null ? chunkRenderTextureSummary.chunkRenderTextureStableDepthBandBucketSize : getStableDepthBandBucketSize(),
      chunkRenderTextureHitRate: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureHitRate != null ? chunkRenderTextureSummary.chunkRenderTextureHitRate : null,
      orderRunCacheActive: !!(orderRunRenderTextureSummary && orderRunRenderTextureSummary.ok === true),
      orderRunCacheEligibleForActive: !!(orderRunDiagnosticsSummary && orderRunDiagnosticsSummary.eligibleForActiveOrderRunCache === true),
      topFragmentedChunks: topFragmentedChunks,
      auditVerdict: verdict
    };
  }


  function buildSafeInputPlanAudit(allItems, chunkEligibilitySplit, chunkRenderTextureSummary, orderRunRenderTextureSummary, playerSensitiveDraw, meta, renderTransform) {
    var all = Array.isArray(allItems) ? allItems : [];
    var split = chunkEligibilitySplit || {};
    var externalItems = Array.isArray(split.chunkItems) ? split.chunkItems : [];
    var sensitiveItems = Array.isArray(split.playerSensitiveItems) ? split.playerSensitiveItems : [];
    var allChunks = Object.create(null);
    var externalChunks = Object.create(null);
    var sensitiveChunks = Object.create(null);
    for (var i = 0; i < all.length; i += 1) allChunks[getPacketChunkKey(all[i] && all[i].packet) || 'chunk:unknown'] = true;
    for (var e = 0; e < externalItems.length; e += 1) externalChunks[getPacketChunkKey(externalItems[e] && externalItems[e].packet) || 'chunk:unknown'] = true;
    for (var sidx = 0; sidx < sensitiveItems.length; sidx += 1) sensitiveChunks[getPacketChunkKey(sensitiveItems[sidx] && sensitiveItems[sidx].packet) || 'chunk:unknown'] = true;
    var actualChunkSprites = chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0) : 0;
    var actualOrderRunSprites = orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? toNumber(orderRunRenderTextureSummary.orderRunRenderTextureCount, 0) : 0;
    var actualGraphicsPackets = playerSensitiveDraw && playerSensitiveDraw.packetDrawCount != null ? toNumber(playerSensitiveDraw.packetDrawCount, 0) : 0;
    var drawUnits = actualChunkSprites + actualOrderRunSprites + actualGraphicsPackets;
    var renderDx = renderTransform && renderTransform.dx != null ? toNumber(renderTransform.dx, 0) : 0;
    var renderDy = renderTransform && renderTransform.dy != null ? toNumber(renderTransform.dy, 0) : 0;
    var zoom = renderTransform && renderTransform.zoom != null ? toNumber(renderTransform.zoom, 1) : null;
    var cameraX = meta && meta.cameraX != null ? toNumber(meta.cameraX, 0) : null;
    var cameraY = meta && meta.cameraY != null ? toNumber(meta.cameraY, 0) : null;
    return {
      step: STEP,
      phase: PHASE,
      source: 'pixi-static-world-consumer.safe-input-plan-audit',
      unsafeStaticInputPlanCacheEnabled: false,
      unsafeStaticInputPlanCacheRemoved: true,
      unsafeStaticInputPlanCacheRemovalReason: 'PXM-07.18K2 cached frame-materialized input plan and caused player movement stalls plus camera-drag face displacement; reverted to K1 GPU chunk/order-run path.',
      staticInputPlanCachePolicy: 'exact-order-fast-hit-plus-content-set-fallback-reusing-existing-staticPacketItemBaseCache',
      safeFutureCacheScope: 'packet-id/base-cache-key plan only; existing caches remain authoritative',
      mustNotCacheFrameDependentItems: true,
      visibleStaticPacketCount: all.length,
      visibleChunkCount: objectKeyCount(allChunks),
      externalChunkCount: objectKeyCount(externalChunks),
      playerSensitiveChunkCount: objectKeyCount(sensitiveChunks),
      externalPacketCount: externalItems.length,
      playerSensitivePacketCount: sensitiveItems.length,
      chunkRenderTextureActualSpriteCount: actualChunkSprites,
      orderRunRenderTextureActualSpriteCount: actualOrderRunSprites,
      graphicsPacketActualCount: actualGraphicsPackets,
      actualStaticDrawUnitCount: drawUnits,
      chunkRenderTextureHitRate: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureHitRate != null ? chunkRenderTextureSummary.chunkRenderTextureHitRate : null,
      orderRunRenderTextureHitRate: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureHitRate != null ? orderRunRenderTextureSummary.orderRunRenderTextureHitRate : null,
      currentFrameTransformSample: {
        dx: roundDiag(renderDx, 3),
        dy: roundDiag(renderDy, 3),
        zoom: zoom == null ? null : roundDiag(zoom, 4),
        cameraX: cameraX == null ? null : roundDiag(cameraX, 3),
        cameraY: cameraY == null ? null : roundDiag(cameraY, 3)
      },
      frameDependentFieldsNotCached: [
        'screen-space bounds',
        'localized draw commands',
        'sprite x/y placement',
        'renderTransform dx/dy',
        'camera x/y',
        'current-frame order item references'
      ],
      stableFieldsAllowedForFutureCache: [
        'packet id groups',
        'chunkKey',
        'chunk/static revision',
        'player-sensitive chunk key set',
        'order-run packet id ranges',
        'viewRotation/cache-space signature',
        'material atlas revision'
      ],
      existingOptimizationReuse: {
        staticPacketItemBaseCache: 'reused as authoritative source for projected geometry, chunkTextureSignature and drawData',
        chunkEligibilitySplitCache: 'reused after stable item plan materialization; no duplicate split cache added',
        orderRunPlanCache: 'reused for player-sensitive order-run grouping; no duplicate order-run cache added',
        playerMoveFastPathStaticOrderCache: 'checked; it caches frame order only and cannot supply Pixi drawData or staticPacketItemBaseCache keys'
      },
      newCacheNecessity: 'No existing cache stores the stable sequence of static packet base-cache keys before chunk split; without this thin plan the Pixi path must rebuild 4298 base-cache keys every frame.',
      nextSafeOptimization: 'move chunk command generation into camera-independent chunk-local coordinates to avoid floor-build-camera misses during drag.'
    };
  }


  function isPlayerChunkDebugOverlayEnabled() {
    try {
      if (global.__PIXI_PLAYER_CHUNK_DEBUG_OVERLAY__ === true) return true;
      if (global.__PIXI_PLAYER_CHUNK_DEBUG_OVERLAY__ === false) return false;
      if (global.localStorage) {
        var raw = global.localStorage.getItem('pixiPlayerChunkDebugOverlay');
        if (raw === '0' || raw === 'false' || raw === 'off') return false;
        if (raw === '1' || raw === 'true' || raw === 'on') return true;
      }
    } catch (_) {}
    // This package is explicitly a debug-overlay build, so keep the overlay on
    // unless the user disables it. It only adds diagnostic display objects and
    // must not affect cache/render decisions.
    return true;
  }

  function isPlayerChunkDebugOverlayLabelsEnabled() {
    try {
      if (global.localStorage) {
        var raw = global.localStorage.getItem('pixiPlayerChunkDebugOverlayLabels');
        if (raw === '0' || raw === 'false' || raw === 'off') return false;
      }
    } catch (_) {}
    return true;
  }

  function getPlayerChunkDebugOverlayGraphics(container) {
    var Pixi = getPixi();
    var Graphics = Pixi && Pixi.Graphics;
    if (!container || typeof Graphics !== 'function') return null;
    var g = state.playerChunkDebugOverlayGraphics || null;
    if (!g) {
      try {
        g = new Graphics();
        g.label = 'pixi-player-chunk-debug-overlay-o5h';
        try { g.eventMode = 'none'; } catch (_) {}
        try { g.zIndex = 2147483000; } catch (_) {}
        state.playerChunkDebugOverlayGraphics = g;
        if (typeof container.addChild === 'function') container.addChild(g);
      } catch (_) { return null; }
    } else {
      try { if (g.parent !== container && typeof container.addChild === 'function') container.addChild(g); } catch (_) {}
      try { g.zIndex = 2147483000; } catch (_) {}
    }
    try { if (typeof g.clear === 'function') g.clear(); } catch (_) {}
    try { g.visible = true; } catch (_) {}
    return g;
  }

  function hidePlayerChunkDebugOverlay() {
    try { if (state.playerChunkDebugOverlayGraphics) state.playerChunkDebugOverlayGraphics.visible = false; } catch (_) {}
    try {
      var labels = Array.isArray(state.playerChunkDebugOverlayTextPool) ? state.playerChunkDebugOverlayTextPool : [];
      for (var i = 0; i < labels.length; i += 1) if (labels[i]) labels[i].visible = false;
    } catch (_) {}
  }

  function getPlayerChunkDebugOverlayText(index, container) {
    if (!isPlayerChunkDebugOverlayLabelsEnabled()) return null;
    var Pixi = getPixi();
    var Text = Pixi && Pixi.Text;
    if (!container || typeof Text !== 'function') return null;
    var list = state.playerChunkDebugOverlayTextPool || (state.playerChunkDebugOverlayTextPool = []);
    var t = list[index] || null;
    if (!t) {
      try {
        try {
          t = new Text({
            text: '',
            style: { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, stroke: { color: 0x000000, width: 3 } }
          });
        } catch (_) {
          t = new Text('', { fontFamily: 'monospace', fontSize: 11, fill: 0xffffff, stroke: 0x000000, strokeThickness: 3 });
        }
        t.label = 'pixi-player-chunk-debug-overlay-label-' + String(index);
        try { t.eventMode = 'none'; } catch (_) {}
        try { t.zIndex = 2147483001; } catch (_) {}
        list[index] = t;
        if (typeof container.addChild === 'function') container.addChild(t);
      } catch (_) { return null; }
    } else {
      try { if (t.parent !== container && typeof container.addChild === 'function') container.addChild(t); } catch (_) {}
      try { t.zIndex = 2147483001; } catch (_) {}
    }
    try { t.visible = true; } catch (_) {}
    return t;
  }

  function setPlayerChunkDebugOverlayText(index, container, text, x, y, color) {
    var t = getPlayerChunkDebugOverlayText(index, container);
    if (!t) return index;
    try { t.text = String(text || ''); } catch (_) {}
    try { t.x = toNumber(x, 0); t.y = toNumber(y, 0); } catch (_) {}
    try {
      if (t.style && color != null) t.style.fill = color;
    } catch (_) {}
    return index + 1;
  }

  function hideUnusedPlayerChunkDebugOverlayTexts(usedCount) {
    try {
      var list = state.playerChunkDebugOverlayTextPool || [];
      for (var i = Math.max(0, toNumber(usedCount, 0)); i < list.length; i += 1) if (list[i]) list[i].visible = false;
    } catch (_) {}
  }

  function drawDebugRect(graphics, bounds, strokeCss, width) {
    if (!graphics || !boundsAreValid(bounds)) return false;
    var minX = toNumber(bounds.minX, 0);
    var minY = toNumber(bounds.minY, 0);
    var maxX = toNumber(bounds.maxX, minX);
    var maxY = toNumber(bounds.maxY, minY);
    var a = { x: minX, y: minY };
    var b = { x: maxX, y: minY };
    var c = { x: maxX, y: maxY };
    var d = { x: minX, y: maxY };
    drawSegment(graphics, a, b, strokeCss, width || 2);
    drawSegment(graphics, b, c, strokeCss, width || 2);
    drawSegment(graphics, c, d, strokeCss, width || 2);
    drawSegment(graphics, d, a, strokeCss, width || 2);
    return true;
  }

  function cloneBoundsForDiag(bounds) {
    if (!boundsAreValid(bounds)) return null;
    return {
      minX: roundDiag(bounds.minX, 2),
      minY: roundDiag(bounds.minY, 2),
      maxX: roundDiag(bounds.maxX, 2),
      maxY: roundDiag(bounds.maxY, 2),
      width: roundDiag(bounds.maxX - bounds.minX, 2),
      height: roundDiag(bounds.maxY - bounds.minY, 2)
    };
  }

  function boundsForItemFinalScreen(item, camera, renderTransform, deps) {
    var bounds = createEmptyBounds();
    var projected = item && item.projected ? item.projected : null;
    var loops = Array.isArray(projected && projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    var points = Array.isArray(projected && projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    if (loops.length) {
      for (var li = 0; li < loops.length; li += 1) expandBoundsWithPoints(bounds, mapNoCameraPointsToFinalScreenPoints(loops[li], camera, renderTransform, deps));
    } else if (points.length) {
      expandBoundsWithPoints(bounds, mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps));
    }
    return boundsAreValid(bounds) ? bounds : null;
  }

  function unionItemFinalBounds(items, camera, renderTransform, deps, maxItems) {
    var bounds = createEmptyBounds();
    var list = Array.isArray(items) ? items : [];
    var limit = Math.min(list.length, Math.max(0, toNumber(maxItems == null ? list.length : maxItems, list.length)));
    var count = 0;
    for (var i = 0; i < limit; i += 1) {
      var ib = boundsForItemFinalScreen(list[i], camera, renderTransform, deps);
      if (!boundsAreValid(ib)) continue;
      expandBoundsWithPoint(bounds, { x: ib.minX, y: ib.minY });
      expandBoundsWithPoint(bounds, { x: ib.maxX, y: ib.maxY });
      count += 1;
    }
    return { bounds: boundsAreValid(bounds) ? bounds : null, count: count };
  }

  function getSpriteScreenBoundsForOverlay(sprite) {
    if (!sprite || sprite.visible === false) return null;
    var width = 0;
    var height = 0;
    try { width = toNumber(sprite.texture && sprite.texture.width, 0); height = toNumber(sprite.texture && sprite.texture.height, 0); } catch (_) {}
    if (!(width > 0 && height > 0)) {
      try { width = toNumber(sprite.width, 0); height = toNumber(sprite.height, 0); } catch (_) {}
      return { minX: toNumber(sprite.x, 0), minY: toNumber(sprite.y, 0), maxX: toNumber(sprite.x, 0) + width, maxY: toNumber(sprite.y, 0) + height };
    }
    var sx = 1;
    var sy = 1;
    try { sx = sprite.scale ? toNumber(sprite.scale.x, 1) : 1; sy = sprite.scale ? toNumber(sprite.scale.y, 1) : 1; } catch (_) {}
    return { minX: toNumber(sprite.x, 0), minY: toNumber(sprite.y, 0), maxX: toNumber(sprite.x, 0) + width * sx, maxY: toNumber(sprite.y, 0) + height * sy };
  }

  function getDisplayObjectBoundsForOverlay(displayObject) {
    if (!displayObject || displayObject.visible === false) return null;
    try {
      if (typeof displayObject.getBounds === 'function') {
        var b = displayObject.getBounds();
        var out = { minX: toNumber(b.x, 0), minY: toNumber(b.y, 0), maxX: toNumber(b.x, 0) + toNumber(b.width, 0), maxY: toNumber(b.y, 0) + toNumber(b.height, 0) };
        return boundsAreValid(out) ? out : null;
      }
    } catch (_) {}
    return null;
  }

  function collectVisibleSpriteOverlaySamples(activeChunkKey, limit) {
    var samples = [];
    var counts = { visibleChunkSpritePoolCount: 0, activeChunkVisibleChunkSpritePoolCount: 0, visibleOrderRunSpritePoolCount: 0 };
    var list = Array.isArray(state.chunkSpritePool) ? state.chunkSpritePool : [];
    for (var i = 0; i < list.length; i += 1) {
      var sprite = list[i];
      if (!sprite || sprite.visible === false) continue;
      var key = '';
      var orderRun = false;
      try { key = String(sprite.__pixiStaticWorldChunkKey || ''); } catch (_) {}
      try { orderRun = sprite.__pixiStaticWorldOrderRunCache === true; } catch (_) {}
      if (orderRun) counts.visibleOrderRunSpritePoolCount += 1;
      else counts.visibleChunkSpritePoolCount += 1;
      if (activeChunkKey && key === String(activeChunkKey)) counts.activeChunkVisibleChunkSpritePoolCount += 1;
      if (samples.length < Math.max(1, toNumber(limit, 8))) {
        var b = getSpriteScreenBoundsForOverlay(sprite);
        samples.push({ index: i, key: key, orderRun: orderRun, transformOnly: sprite.__pixiStaticWorldChunkTransformOnly === true, x: roundDiag(sprite.x, 2), y: roundDiag(sprite.y, 2), scaleX: sprite.scale ? roundDiag(sprite.scale.x, 3) : 1, scaleY: sprite.scale ? roundDiag(sprite.scale.y, 3) : 1, bounds: cloneBoundsForDiag(b) });
      }
    }
    counts.samples = samples;
    return counts;
  }

  function updatePlayerChunkDebugOverlay(container, chunkEligibilitySplit, chunkRenderTextureSummary, orderRunRenderTextureSummary, playerSensitiveDraw, playerSensitiveGraphicsItems, camera, renderTransform, deps) {
    if (!isPlayerChunkDebugOverlayEnabled()) {
      hidePlayerChunkDebugOverlay();
      return null;
    }
    var overlay = getPlayerChunkDebugOverlayGraphics(container);
    if (!overlay) return null;
    var demergeState = getStableLocalDemergeLastState();
    var activeChunkKey = demergeState && demergeState.playerInteractionChunkKey ? String(demergeState.playerInteractionChunkKey) : '';
    var split = chunkEligibilitySplit || { chunkItems: [], playerSensitiveItems: [] };
    var sensitiveItems = Array.isArray(split.playerSensitiveItems) ? split.playerSensitiveItems : [];
    var graphicsItems = Array.isArray(playerSensitiveGraphicsItems) ? playerSensitiveGraphicsItems : [];
    var activeChunkItems = [];
    for (var i = 0; i < sensitiveItems.length; i += 1) {
      if (!activeChunkKey || getPacketChunkKey(sensitiveItems[i] && sensitiveItems[i].packet) === activeChunkKey) activeChunkItems.push(sensitiveItems[i]);
    }
    var activeExpected = unionItemFinalBounds(activeChunkItems, camera, renderTransform, deps, 600);
    var graphicsExpected = unionItemFinalBounds(graphicsItems, camera, renderTransform, deps, 600);
    var actualGraphicsBounds = createEmptyBounds();
    var actualGraphicsCount = 0;
    var graphicsSampleBounds = [];
    var graphicsLimit = Math.max(0, toNumber(playerSensitiveDraw && playerSensitiveDraw.graphicsIndex, graphicsItems.length));
    for (var gi = 0; gi < Math.min(graphicsLimit, state.graphicsPool.length); gi += 1) {
      var g = state.graphicsPool[gi];
      var gb = getDisplayObjectBoundsForOverlay(g);
      if (!boundsAreValid(gb)) continue;
      expandBoundsWithPoint(actualGraphicsBounds, { x: gb.minX, y: gb.minY });
      expandBoundsWithPoint(actualGraphicsBounds, { x: gb.maxX, y: gb.maxY });
      actualGraphicsCount += 1;
      if (graphicsSampleBounds.length < 6) graphicsSampleBounds.push({ index: gi, bounds: cloneBoundsForDiag(gb), x: roundDiag(g.x, 2), y: roundDiag(g.y, 2), scaleX: g.scale ? roundDiag(g.scale.x, 3) : 1, scaleY: g.scale ? roundDiag(g.scale.y, 3) : 1, zIndex: g.zIndex != null ? roundDiag(g.zIndex, 3) : null });
    }
    var spriteSamples = collectVisibleSpriteOverlaySamples(activeChunkKey, 10);
    var labelIndex = 0;
    // Blue: ordinary chunk RenderTexture sprites.
    var sprites = Array.isArray(state.chunkSpritePool) ? state.chunkSpritePool : [];
    var blueDrawn = 0;
    var yellowDrawn = 0;
    for (var si = 0; si < sprites.length; si += 1) {
      var sp = sprites[si];
      if (!sp || sp.visible === false) continue;
      var sb = getSpriteScreenBoundsForOverlay(sp);
      if (!boundsAreValid(sb)) continue;
      var isOrderRun = false;
      try { isOrderRun = sp.__pixiStaticWorldOrderRunCache === true; } catch (_) {}
      if (isOrderRun) {
        if (yellowDrawn < 24) { drawDebugRect(overlay, sb, '#ffff00', 2); yellowDrawn += 1; }
      } else {
        if (blueDrawn < 48) { drawDebugRect(overlay, sb, '#2f80ff', 1); blueDrawn += 1; }
      }
    }
    // Red: expected bounds of active player chunk sensitive packets.
    if (activeExpected.bounds) {
      drawDebugRect(overlay, activeExpected.bounds, '#ff3030', 3);
      labelIndex = setPlayerChunkDebugOverlayText(labelIndex, container, 'RED active player chunk expected: ' + activeChunkKey + ' n=' + activeExpected.count, activeExpected.bounds.minX, activeExpected.bounds.minY - 14, 0xff3030);
    }
    // Green: expected bounds of the actual Graphics item list.
    if (graphicsExpected.bounds) {
      drawDebugRect(overlay, graphicsExpected.bounds, '#00ff66', 2);
      labelIndex = setPlayerChunkDebugOverlayText(labelIndex, container, 'GREEN player-sensitive Graphics expected n=' + graphicsExpected.count, graphicsExpected.bounds.minX, graphicsExpected.bounds.maxY + 2, 0x00ff66);
    }
    // Cyan: actual Pixi Graphics display bounds from the pool.
    if (boundsAreValid(actualGraphicsBounds)) {
      drawDebugRect(overlay, actualGraphicsBounds, '#00e5ff', 2);
      labelIndex = setPlayerChunkDebugOverlayText(labelIndex, container, 'CYAN actual visible Graphics bounds n=' + actualGraphicsCount, actualGraphicsBounds.minX, actualGraphicsBounds.maxY + 16, 0x00e5ff);
    }
    labelIndex = setPlayerChunkDebugOverlayText(labelIndex, container, 'O5H overlay only | red=active chunk | blue=chunkRT | green=graphics expected | cyan=graphics actual | yellow=order-run', 12, 12, 0xffffff);
    labelIndex = setPlayerChunkDebugOverlayText(labelIndex, container, 'transform active=' + String(!!(renderTransform && renderTransform.active === true)) + ' scale=' + roundDiag(renderTransform && renderTransform.scale, 3) + ' sprite=(' + roundDiag(renderTransform && renderTransform.spriteX, 2) + ',' + roundDiag(renderTransform && renderTransform.spriteY, 2) + ') cacheSpace=' + String(renderTransform && renderTransform.active === true ? 'floor-build' : 'current'), 12, 28, 0xffffff);
    hideUnusedPlayerChunkDebugOverlayTexts(labelIndex);
    try { if (overlay && overlay.parent === container && typeof container.addChild === 'function') container.addChild(overlay); } catch (_) {}
    try {
      var textPool = state.playerChunkDebugOverlayTextPool || [];
      for (var ti = 0; ti < textPool.length; ti += 1) if (textPool[ti] && textPool[ti].visible !== false && textPool[ti].parent === container && typeof container.addChild === 'function') container.addChild(textPool[ti]);
    } catch (_) {}
    var summary = {
      step: STEP,
      phase: PHASE,
      frameSeq: state.frameSeq,
      overlayEnabled: true,
      activeChunkKey: activeChunkKey,
      transformActive: !!(renderTransform && renderTransform.active === true),
      transformScale: roundDiag(renderTransform && renderTransform.scale, 4),
      transformSpriteX: roundDiag(renderTransform && renderTransform.spriteX, 3),
      transformSpriteY: roundDiag(renderTransform && renderTransform.spriteY, 3),
      floorBuildCameraX: roundDiag(renderTransform && renderTransform.floorBuildCameraX, 3),
      floorBuildCameraY: roundDiag(renderTransform && renderTransform.floorBuildCameraY, 3),
      floorBuildZoom: roundDiag(renderTransform && renderTransform.floorBuildZoom, 4),
      currentCameraX: roundDiag(camera && camera.x, 3),
      currentCameraY: roundDiag(camera && camera.y, 3),
      sensitivePacketCount: sensitiveItems.length,
      activeChunkSensitivePacketCount: activeChunkItems.length,
      graphicsItemCount: graphicsItems.length,
      actualGraphicsVisibleCount: actualGraphicsCount,
      activeChunkExpectedBounds: cloneBoundsForDiag(activeExpected.bounds),
      graphicsExpectedBounds: cloneBoundsForDiag(graphicsExpected.bounds),
      actualGraphicsBounds: cloneBoundsForDiag(actualGraphicsBounds),
      visibleChunkSpritePoolCount: spriteSamples.visibleChunkSpritePoolCount,
      activeChunkVisibleChunkSpritePoolCount: spriteSamples.activeChunkVisibleChunkSpritePoolCount,
      visibleOrderRunSpritePoolCount: spriteSamples.visibleOrderRunSpritePoolCount,
      chunkRenderTextureCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0) : 0,
      orderRunRenderTextureCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? toNumber(orderRunRenderTextureSummary.orderRunRenderTextureCount, 0) : 0,
      spriteSamples: spriteSamples.samples,
      graphicsSampleBounds: graphicsSampleBounds
    };
    var signature = [summary.activeChunkKey, summary.transformActive, summary.transformScale, summary.activeChunkSensitivePacketCount, summary.graphicsItemCount, summary.actualGraphicsVisibleCount, summary.activeChunkVisibleChunkSpritePoolCount, summary.visibleOrderRunSpritePoolCount, summary.chunkRenderTextureCount, summary.orderRunRenderTextureCount].join('|');
    var emitNow = summary.transformActive || summary.activeChunkVisibleChunkSpritePoolCount > 0 || signature !== state.lastPlayerChunkDebugOverlaySignature || (nowMs() - toNumber(state.lastPlayerChunkDebugOverlayEmitAt, 0)) > 1000;
    if (emitNow) {
      state.lastPlayerChunkDebugOverlaySignature = signature;
      state.lastPlayerChunkDebugOverlayEmitAt = nowMs();
      emit('player-chunk-debug-overlay', summary);
    }
    return summary;
  }

  function tryDrawChunkRenderTextureFrame(items, container, renderTransform) {
    var Pixi = getPixi();
    var Graphics = Pixi && Pixi.Graphics;
    if (!Pixi || typeof Graphics !== 'function' || !container || !items || !items.length) {
      return { ok: false, reason: 'chunk-render-texture-prerequisites-missing' };
    }
    if (!getPixiRendererInstance()) return { ok: false, reason: 'pixi-renderer-missing' };
    var startedAt = nowMs();
    var chunkGroupBuildStartedAt = nowMs();
    var groups = buildChunkGroups(items);
    var chunkGroupBuildMs = Math.max(0, nowMs() - chunkGroupBuildStartedAt);
    assertNoLegacyStableDepthBandChunkGroups(groups, 'tryDrawChunkRenderTextureFrame');
    var spriteIndex = 0;
    var hitCount = 0;
    var missCount = 0;
    var rebuildPacketCount = 0;
    var reusablePacketCount = 0;
    var largestPacketCount = 0;
    var largestChunkKey = '';
    var padding = 4;
    var chunkSignatureBuildMs = 0;
    var chunkCacheLookupMs = 0;
    var chunkTextureCreateMs = 0;
    var chunkGraphicsCreateMs = 0;
    var chunkCommandDrawMs = 0;
    var chunkRenderToTextureMs = 0;
    var chunkTextureDestroyMs = 0;
    var chunkSpriteApplyMs = 0;
    var chunkRenderTextureCreateCount = 0;
    var chunkRenderTextureDestroyCount = 0;
    var chunkRenderTextureUploadCount = 0;
    var chunkRenderTextureMissReasonCounts = Object.create(null);
    var chunkRenderTextureMissSamples = [];
    for (var gi = 0; gi < groups.length; gi += 1) {
      var group = groups[gi];
      if (!boundsAreValid(group.bounds) || !group.commands.length) return { ok: false, reason: 'invalid-chunk-bounds-or-empty-commands', chunkKey: group.chunkKey };
      var signatureStartedAt = nowMs();
      var signature = buildChunkTextureSignature(group);
      chunkSignatureBuildMs += Math.max(0, nowMs() - signatureStartedAt);
      var cacheLookupStartedAt = nowMs();
      var cache = state.chunkRenderTextureCache[group.chunkKey] || null;
      var width = Math.max(1, Math.ceil(group.bounds.maxX - group.bounds.minX + padding * 2));
      var height = Math.max(1, Math.ceil(group.bounds.maxY - group.bounds.minY + padding * 2));
      var hit = !!(cache && cache.signature === signature && cache.texture && Math.ceil(cache.width) === width && Math.ceil(cache.height) === height);
      chunkCacheLookupMs += Math.max(0, nowMs() - cacheLookupStartedAt);
      if (!hit) {
        var chunkMissDiag = buildRenderTextureMissDiagnostic('chunk', group.chunkKey, cache, signature, width, height, group, renderTransform);
        countObjectKey(chunkRenderTextureMissReasonCounts, chunkMissDiag.reason);
        addUniqueSample(chunkRenderTextureMissSamples, chunkMissDiag, 6);
        missCount += 1;
        rebuildPacketCount += group.packetCount;
        var textureStartedAt = nowMs();
        var texture = makeChunkRenderTexture(width, height);
        chunkTextureCreateMs += Math.max(0, nowMs() - textureStartedAt);
        chunkRenderTextureCreateCount += texture ? 1 : 0;
        if (!texture) return { ok: false, reason: 'render-texture-create-failed', chunkKey: group.chunkKey };
        var graphics = null;
        var graphicsCreateStartedAt = nowMs();
        try { graphics = new Graphics(); } catch (_) { graphics = null; }
        chunkGraphicsCreateMs += Math.max(0, nowMs() - graphicsCreateStartedAt);
        if (!graphics) return { ok: false, reason: 'chunk-graphics-create-failed', chunkKey: group.chunkKey };
        var drawOkCount = 0;
        var commandDrawStartedAt = nowMs();
        for (var ci = 0; ci < group.commands.length; ci += 1) {
          if (drawLocalCommand(graphics, group.commands[ci], group.bounds.minX, group.bounds.minY, padding)) drawOkCount += 1;
        }
        chunkCommandDrawMs += Math.max(0, nowMs() - commandDrawStartedAt);
        if (!drawOkCount) return { ok: false, reason: 'chunk-commands-draw-failed', chunkKey: group.chunkKey };
        var renderToTextureStartedAt = nowMs();
        if (!renderDisplayObjectToTexture(graphics, texture)) return { ok: false, reason: 'render-to-texture-failed', chunkKey: group.chunkKey };
        chunkRenderToTextureMs += Math.max(0, nowMs() - renderToTextureStartedAt);
        chunkRenderTextureUploadCount += 1;
        try { if (graphics && typeof graphics.destroy === 'function') graphics.destroy({ children: true }); } catch (_) {}
        var destroyStartedAt = nowMs();
        try {
          if (cache && cache.texture && cache.texture !== texture && typeof cache.texture.destroy === 'function') { cache.texture.destroy(true); chunkRenderTextureDestroyCount += 1; }
        } catch (_) {}
        chunkTextureDestroyMs += Math.max(0, nowMs() - destroyStartedAt);
        cache = state.chunkRenderTextureCache[group.chunkKey] = {
          signature: signature,
          texture: texture,
          width: width,
          height: height,
          minX: group.bounds.minX,
          minY: group.bounds.minY,
          packetCount: group.packetCount,
          commandCount: group.commands.length,
          lastUpdatedAt: nowMs()
        };
        assignRenderTextureCacheMeta(cache, renderTransform);
      } else {
        hitCount += 1;
        reusablePacketCount += group.packetCount;
      }
      largestPacketCount = Math.max(largestPacketCount, group.packetCount);
      if (largestPacketCount === group.packetCount) largestChunkKey = group.chunkKey;
      var sprite = getChunkSprite(spriteIndex, container);
      if (!sprite) return { ok: false, reason: 'chunk-sprite-allocation-failed', chunkKey: group.chunkKey };
      var spriteApplyStartedAt = nowMs();
      try {
        var transformOnlyScale = renderTransform && renderTransform.active === true ? toNumber(renderTransform.scale, 1) : 1;
        var baseX = cache.minX - padding;
        var baseY = cache.minY - padding;
        sprite.texture = cache.texture;
        sprite.x = renderTransform && renderTransform.active === true ? toNumber(renderTransform.spriteX, 0) + transformOnlyScale * baseX : baseX;
        sprite.y = renderTransform && renderTransform.active === true ? toNumber(renderTransform.spriteY, 0) + transformOnlyScale * baseY : baseY;
        if (sprite.scale) {
          sprite.scale.x = transformOnlyScale;
          sprite.scale.y = transformOnlyScale;
        }
        sprite.zIndex = group.minOrderIndex;
        sprite.visible = true;
        sprite.__pixiStaticWorldChunkKey = group.chunkKey;
        sprite.__pixiFramePlanOrderIndex = group.minOrderIndex;
        sprite.__pixiStaticWorldChunkTransformOnly = !!(renderTransform && renderTransform.active === true);
      } catch (_) { return { ok: false, reason: 'chunk-sprite-update-failed', chunkKey: group.chunkKey }; }
      chunkSpriteApplyMs += Math.max(0, nowMs() - spriteApplyStartedAt);
      spriteIndex += 1;
    }
    clearUnusedChunkSprites(spriteIndex);
    hidePerPacketGraphics();
    try { if (container && typeof container.sortChildren === 'function') container.sortChildren(); } catch (_) {}
    var collectDepthDiagnostics = shouldCollectHeavyStaticDiagnostics() || getVerboseChunkDepthDiagnosticsEnabled();
    var depthDiagnostics = collectDepthDiagnostics ? buildChunkDepthDiagnostics(groups) : null;
    try {
      if (depthDiagnostics && (depthDiagnostics.riskGroupCount > 0 || getVerboseChunkDepthDiagnosticsEnabled())) {
        emit('chunk-depth-diagnostics', {
          frameSeq: state.frameSeq,
          chunkRenderTextureGroupCount: groups.length,
          depthRiskGroupCount: depthDiagnostics.riskGroupCount,
          maxOrderSpan: depthDiagnostics.maxOrderSpan,
          maxSortSpan: depthDiagnostics.maxSortSpan,
          maxDepthSpan: depthDiagnostics.maxDepthSpan,
          maxCellZSpan: depthDiagnostics.maxCellZSpan,
          topGroups: depthDiagnostics.topGroups
        });
      }
    } catch (_) {}
    emitRenderTextureChurnDiagnostics({
      frameSeq: state.frameSeq,
      kind: 'chunk-render-texture',
      groupCount: groups.length,
      hitCount: hitCount,
      missCount: missCount,
      uploadCount: chunkRenderTextureUploadCount,
      createCount: chunkRenderTextureCreateCount,
      destroyCount: chunkRenderTextureDestroyCount,
      reusablePacketCount: reusablePacketCount,
      rebuildPacketCount: rebuildPacketCount,
      largestPacketCount: largestPacketCount,
      largestChunkKey: largestChunkKey,
      cacheSpace: renderTransform && renderTransform.active === true ? 'floor-build-screen-space' : 'current-screen-space',
      transformActive: !!(renderTransform && renderTransform.active === true),
      transformScale: roundDiag(renderTransform && renderTransform.active === true ? toNumber(renderTransform.scale, 1) : 1, 4),
      reasonCounts: chunkRenderTextureMissReasonCounts,
      samples: chunkRenderTextureMissSamples
    });
    return {
      ok: true,
      renderer: 'pixi-static-world-chunk-render-texture-cache',
      chunkRenderTextureAdopted: true,
      chunkRenderTextureDiagnosticOnly: false,
      chunkRenderTextureCount: groups.length,
      chunkRenderTextureHitCount: hitCount,
      chunkRenderTextureMissCount: missCount,
      chunkRenderTextureHitRate: groups.length ? Number((hitCount / groups.length).toFixed(4)) : 0,
      chunkRenderTextureReusablePacketCount: reusablePacketCount,
      chunkRenderTextureRebuildPacketCount: rebuildPacketCount,
      chunkRenderTextureLargestPacketCount: largestPacketCount,
      chunkRenderTextureLargestChunkKey: largestChunkKey,
      chunkRenderTextureWallMs: Number(Math.max(0, nowMs() - startedAt).toFixed(3)),
      chunkRenderTextureGroupBuildMs: Number(chunkGroupBuildMs.toFixed(3)),
      chunkRenderTextureSignatureBuildMs: Number(chunkSignatureBuildMs.toFixed(3)),
      chunkRenderTextureCacheLookupMs: Number(chunkCacheLookupMs.toFixed(3)),
      chunkRenderTextureTextureCreateMs: Number(chunkTextureCreateMs.toFixed(3)),
      chunkRenderTextureGraphicsCreateMs: Number(chunkGraphicsCreateMs.toFixed(3)),
      chunkRenderTextureCommandDrawMs: Number(chunkCommandDrawMs.toFixed(3)),
      chunkRenderTextureRenderToTextureMs: Number(chunkRenderToTextureMs.toFixed(3)),
      chunkRenderTextureTextureDestroyMs: Number(chunkTextureDestroyMs.toFixed(3)),
      chunkRenderTextureSpriteApplyMs: Number(chunkSpriteApplyMs.toFixed(3)),
      chunkRenderTextureCreateCount: chunkRenderTextureCreateCount,
      chunkRenderTextureReuseCount: hitCount,
      chunkRenderTextureDestroyCount: chunkRenderTextureDestroyCount,
      chunkRenderTextureUploadCount: chunkRenderTextureUploadCount,
      chunkRenderTextureMissReasonCounts: chunkRenderTextureMissReasonCounts,
      chunkRenderTextureMissSamples: chunkRenderTextureMissSamples,
      chunkRenderTexturePreservesFramePlanRuns: false,
      chunkRenderTextureExternalChunksIgnorePlayerRunSplits: true,
      chunkRenderTextureExternalChunksUseStableDepthBands: false,
      chunkRenderTextureExternalChunkGroupingMode: getExternalChunkCacheGroupingMode(),
      chunkRenderTextureStableDepthBandPathUsed: false,
      chunkRenderTextureStableDepthBandBucketSize: getStableDepthBandBucketSize(),
      chunkRenderTexturePlayerChunkRemainsDynamic: true,
      chunkRenderTextureTransformOnlySprites: !!(renderTransform && renderTransform.active === true),
      chunkRenderTextureCacheSpace: renderTransform && renderTransform.active === true ? 'floor-build-screen-space' : 'current-screen-space',
      chunkRenderTextureCurrentCameraIndependent: !!(renderTransform && renderTransform.active === true),
      chunkRenderTextureDepthDiagnosticGroupCount: depthDiagnostics ? depthDiagnostics.groupCount : groups.length,
      chunkRenderTextureDepthRiskGroupCount: depthDiagnostics ? depthDiagnostics.riskGroupCount : 0,
      chunkRenderTextureDepthMaxOrderSpan: depthDiagnostics ? depthDiagnostics.maxOrderSpan : 0,
      chunkRenderTextureDepthMaxSortSpan: depthDiagnostics ? depthDiagnostics.maxSortSpan : 0,
      chunkRenderTextureDepthMaxDepthSpan: depthDiagnostics ? depthDiagnostics.maxDepthSpan : 0,
      chunkRenderTextureDepthMaxCellZSpan: depthDiagnostics ? depthDiagnostics.maxCellZSpan : 0
    };
  }

  function isOrderRunRenderTextureCacheEnabled() {
    try {
      if (global.__PIXI_STATIC_ORDER_RUN_RENDER_TEXTURE_CACHE__ === false) return false;
      if (global.localStorage) {
        var raw = global.localStorage.getItem('pixiStaticOrderRunRenderTextureCache');
        if (raw === '0' || raw === 'false' || raw === 'off') return false;
        if (raw === '1' || raw === 'true' || raw === 'on') return true;
      }
    } catch (_) {}
    return true;
  }

  function getOrderRunRenderTextureMinPacketCount() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticOrderRunRenderTextureMinPacketCount'); } catch (_) {}
    var n = Number(raw);
    // PXM-07.18O5K: default to 1 so singleton player-sensitive terrain faces
    // are also baked into order-run RenderTexture sprites instead of leaking
    // into the visible Pixi.Graphics path.  This keeps the small residual
    // terrain face on the same sprite transform path as the other cached
    // terrain during drag/zoom, without disabling the whole active chunk or
    // changing face-merge policy.
    if (!Number.isFinite(n) || n < 1) n = 1;
    return Math.max(1, Math.min(64, Math.floor(n)));
  }

  function makeOrderRunRenderTextureCacheKey(group) {
    return [
      'order-run-rt-v=07.18C',
      'start=' + String(group && group.minOrderIndex != null ? group.minOrderIndex : ''),
      'end=' + String(group && group.maxOrderIndex != null ? group.maxOrderIndex : ''),
      'chunk=' + String(group && group.primaryChunkKey || '')
    ].join('|');
  }

  function buildOrderRunRenderTextureSignature(group) {
    var parts = [
      'order-run-rt-v=07.18C',
      'key=' + String(group.cacheKey || ''),
      'packets=' + String(group.packetCount || 0),
      'bounds=' + safeRoundForSignature(group.bounds.minX, 2) + ',' + safeRoundForSignature(group.bounds.minY, 2) + ',' + safeRoundForSignature(group.bounds.maxX, 2) + ',' + safeRoundForSignature(group.bounds.maxY, 2)
    ];
    for (var i = 0; i < group.packetSignatures.length; i += 1) parts.push(group.packetSignatures[i]);
    return parts.join('|');
  }

  function buildPlayerSensitiveOrderRunRenderTexturePlan(items) {
    var list = Array.isArray(items) ? items.slice() : [];
    list.sort(function (a, b) { return getItemOrderIndex(a) - getItemOrderIndex(b); });
    var minPacketCount = getOrderRunRenderTextureMinPacketCount();
    var out = {
      cacheGroups: [],
      graphicsItems: [],
      totalPacketCount: list.length,
      cachedPacketCount: 0,
      graphicsPacketCount: 0,
      singletonPacketCount: 0,
      nonConsecutiveBreakCount: 0,
      skippedSmallRunCount: 0,
      orderInversionRiskCount: 0,
      minPacketCount: minPacketCount
    };

    function finalizeRun(runItems, endReason) {
      if (!runItems || !runItems.length) return;
      var valid = true;
      var group = {
        cacheKey: '',
        primaryChunkKey: '',
        minOrderIndex: Infinity,
        maxOrderIndex: -Infinity,
        packetCount: runItems.length,
        packetSignatures: [],
        commands: [],
        bounds: createEmptyBounds(),
        samplePacketIds: [],
        endReason: String(endReason || '')
      };
      var chunkCounts = Object.create(null);
      for (var ri = 0; ri < runItems.length; ri += 1) {
        var item = runItems[ri];
        var orderIndex = getItemOrderIndex(item);
        if (ri > 0 && getItemOrderIndex(runItems[ri - 1]) + 1 !== orderIndex) valid = false;
        group.minOrderIndex = Math.min(group.minOrderIndex, orderIndex);
        group.maxOrderIndex = Math.max(group.maxOrderIndex, orderIndex);
        group.packetSignatures.push(item.chunkTextureSignature || item.renderSignature || 'packet:' + String(item.packet && item.packet.id || ri));
        if (group.samplePacketIds.length < 4) group.samplePacketIds.push(String(item.packet && item.packet.id || ''));
        countObjectKey(chunkCounts, getPacketChunkKey(item && item.packet));
        var drawData = item.drawData || null;
        if (!(drawData && Array.isArray(drawData.commands) && drawData.commands.length && boundsAreValid(drawData.bounds))) valid = false;
        if (drawData && Array.isArray(drawData.commands)) {
          for (var ci = 0; ci < drawData.commands.length; ci += 1) group.commands.push(drawData.commands[ci]);
          expandBoundsWithPoint(group.bounds, { x: drawData.bounds.minX, y: drawData.bounds.minY });
          expandBoundsWithPoint(group.bounds, { x: drawData.bounds.maxX, y: drawData.bounds.maxY });
        }
      }
      var chunkKeys = Object.keys(chunkCounts);
      group.primaryChunkKey = chunkKeys.length ? chunkKeys[0] : '';
      group.cacheKey = makeOrderRunRenderTextureCacheKey(group);
      if (!valid || !boundsAreValid(group.bounds) || !group.commands.length) {
        out.orderInversionRiskCount += valid ? 0 : 1;
        for (var gi = 0; gi < runItems.length; gi += 1) out.graphicsItems.push(runItems[gi]);
        out.graphicsPacketCount += runItems.length;
        return;
      }
      if (runItems.length < minPacketCount) {
        out.skippedSmallRunCount += 1;
        if (runItems.length === 1) out.singletonPacketCount += 1;
        for (var si = 0; si < runItems.length; si += 1) out.graphicsItems.push(runItems[si]);
        out.graphicsPacketCount += runItems.length;
        return;
      }
      out.cacheGroups.push(group);
      out.cachedPacketCount += runItems.length;
    }

    var currentRun = [];
    var previousOrder = null;
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      var orderIndex = getItemOrderIndex(item);
      if (currentRun.length && previousOrder != null && orderIndex !== previousOrder + 1) {
        out.nonConsecutiveBreakCount += 1;
        finalizeRun(currentRun, 'non-consecutive-order-boundary');
        currentRun = [];
      }
      currentRun.push(item);
      previousOrder = orderIndex;
    }
    if (currentRun.length) finalizeRun(currentRun, 'end-of-player-sensitive-items');
    return out;
  }

  function tryDrawOrderRunRenderTextureFrame(items, container, renderTransform, spriteStartIndex) {
    var Pixi = getPixi();
    var Graphics = Pixi && Pixi.Graphics;
    var startedAt = nowMs();
    var planStartedAt = nowMs();
    var planCacheKey = makeOrderRunPlanCacheKey(items);
    var cachedPlan = state.orderRunPlanCache && state.orderRunPlanCache[planCacheKey] || null;
    var plan = cachedPlan ? cloneOrderRunPlanForFrame(cachedPlan.plan) : null;
    var orderRunPlanBuildCount = 0;
    var orderRunPlanReuseCount = 0;
    var orderRunPlanRebuildReason = '';
    var orderRunGraphicsItemRebindSummary = { reboundCount: 0, missingCount: 0, graphicsItemCount: 0 };
    if (plan) {
      orderRunPlanReuseCount = 1;
      orderRunPlanRebuildReason = 'reused-static-order-run-plan-current-graphics-items-rebound';
      orderRunGraphicsItemRebindSummary = rebindOrderRunGraphicsItemsToCurrentFrame(plan, items);
      cachedPlan.lastUsedSeq = ++state.orderRunPlanCacheSeq;
    } else {
      plan = buildPlayerSensitiveOrderRunRenderTexturePlan(items);
      orderRunPlanBuildCount = 1;
      orderRunPlanRebuildReason = 'plan-cache-miss-or-static-order-changed';
      if (!state.orderRunPlanCache) state.orderRunPlanCache = Object.create(null);
      state.orderRunPlanCache[planCacheKey] = {
        plan: cloneOrderRunPlanForFrame(plan),
        lastUsedSeq: ++state.orderRunPlanCacheSeq
      };
    }
    var orderRunPlanBuildMs = Math.max(0, nowMs() - planStartedAt);
    if (!Pixi || typeof Graphics !== 'function' || !container || !getPixiRendererInstance()) {
      return Object.assign(plan, {
        ok: false,
        reason: 'order-run-render-texture-prerequisites-missing',
        orderRunPlanBuildCount: orderRunPlanBuildCount,
        orderRunPlanReuseCount: orderRunPlanReuseCount,
        orderRunPlanCacheHitRate: orderRunPlanReuseCount ? 1 : 0,
        orderRunPlanBuildMs: Number(orderRunPlanBuildMs.toFixed(3)),
        orderRunPlanRebuildReason: orderRunPlanRebuildReason,
        orderRunRenderTextureWallMs: Number(Math.max(0, nowMs() - startedAt).toFixed(3))
      });
    }
    var groups = plan.cacheGroups;
    var spriteIndex = Math.max(0, toNumber(spriteStartIndex, 0));
    var hitCount = 0;
    var missCount = 0;
    var rebuildPacketCount = 0;
    var reusablePacketCount = 0;
    var largestPacketCount = 0;
    var padding = 4;
    var orderRunSignatureBuildMs = 0;
    var orderRunCacheLookupMs = 0;
    var orderRunTextureCreateMs = 0;
    var orderRunGraphicsCreateMs = 0;
    var orderRunCommandDrawMs = 0;
    var orderRunRenderToTextureMs = 0;
    var orderRunTextureDestroyMs = 0;
    var orderRunSpriteApplyMs = 0;
    var orderRunRenderTextureCreateCount = 0;
    var orderRunRenderTextureDestroyCount = 0;
    var orderRunRenderTextureMissReasonCounts = Object.create(null);
    var orderRunRenderTextureMissSamples = [];
    for (var gi = 0; gi < groups.length; gi += 1) {
      var group = groups[gi];
      if (!boundsAreValid(group.bounds) || !group.commands.length) return Object.assign(plan, { ok: false, reason: 'invalid-order-run-bounds-or-empty-commands' });
      var signatureStartedAt = nowMs();
      var signature = buildOrderRunRenderTextureSignature(group);
      orderRunSignatureBuildMs += Math.max(0, nowMs() - signatureStartedAt);
      var cacheLookupStartedAt = nowMs();
      var cache = state.chunkRenderTextureCache[group.cacheKey] || null;
      var width = Math.max(1, Math.ceil(group.bounds.maxX - group.bounds.minX + padding * 2));
      var height = Math.max(1, Math.ceil(group.bounds.maxY - group.bounds.minY + padding * 2));
      var hit = !!(cache && cache.signature === signature && cache.texture && Math.ceil(cache.width) === width && Math.ceil(cache.height) === height);
      orderRunCacheLookupMs += Math.max(0, nowMs() - cacheLookupStartedAt);
      if (!hit) {
        var orderRunMissDiag = buildRenderTextureMissDiagnostic('order-run', group.cacheKey, cache, signature, width, height, group, renderTransform);
        countObjectKey(orderRunRenderTextureMissReasonCounts, orderRunMissDiag.reason);
        addUniqueSample(orderRunRenderTextureMissSamples, orderRunMissDiag, 8);
        missCount += 1;
        rebuildPacketCount += group.packetCount;
        var textureStartedAt = nowMs();
        var texture = makeChunkRenderTexture(width, height);
        orderRunTextureCreateMs += Math.max(0, nowMs() - textureStartedAt);
        orderRunRenderTextureCreateCount += texture ? 1 : 0;
        if (!texture) return Object.assign(plan, { ok: false, reason: 'order-run-render-texture-create-failed', failedCacheKey: group.cacheKey });
        var graphics = null;
        var graphicsCreateStartedAt = nowMs();
        try { graphics = new Graphics(); } catch (_) { graphics = null; }
        orderRunGraphicsCreateMs += Math.max(0, nowMs() - graphicsCreateStartedAt);
        if (!graphics) return Object.assign(plan, { ok: false, reason: 'order-run-graphics-create-failed', failedCacheKey: group.cacheKey });
        var drawOkCount = 0;
        var commandDrawStartedAt = nowMs();
        for (var ci = 0; ci < group.commands.length; ci += 1) {
          if (drawLocalCommand(graphics, group.commands[ci], group.bounds.minX, group.bounds.minY, padding)) drawOkCount += 1;
        }
        orderRunCommandDrawMs += Math.max(0, nowMs() - commandDrawStartedAt);
        if (!drawOkCount) return Object.assign(plan, { ok: false, reason: 'order-run-commands-draw-failed', failedCacheKey: group.cacheKey });
        var renderToTextureStartedAt = nowMs();
        if (!renderDisplayObjectToTexture(graphics, texture)) return Object.assign(plan, { ok: false, reason: 'order-run-render-to-texture-failed', failedCacheKey: group.cacheKey });
        orderRunRenderToTextureMs += Math.max(0, nowMs() - renderToTextureStartedAt);
        try { if (graphics && typeof graphics.destroy === 'function') graphics.destroy({ children: true }); } catch (_) {}
        var destroyStartedAt = nowMs();
        try { if (cache && cache.texture && cache.texture !== texture && typeof cache.texture.destroy === 'function') { cache.texture.destroy(true); orderRunRenderTextureDestroyCount += 1; } } catch (_) {}
        orderRunTextureDestroyMs += Math.max(0, nowMs() - destroyStartedAt);
        cache = state.chunkRenderTextureCache[group.cacheKey] = {
          signature: signature,
          texture: texture,
          width: width,
          height: height,
          minX: group.bounds.minX,
          minY: group.bounds.minY,
          packetCount: group.packetCount,
          commandCount: group.commands.length,
          lastUpdatedAt: nowMs(),
          orderRunCache: true
        };
        assignRenderTextureCacheMeta(cache, renderTransform);
      } else {
        hitCount += 1;
        reusablePacketCount += group.packetCount;
      }
      largestPacketCount = Math.max(largestPacketCount, group.packetCount);
      var sprite = getChunkSprite(spriteIndex, container);
      if (!sprite) return Object.assign(plan, { ok: false, reason: 'order-run-sprite-allocation-failed', failedCacheKey: group.cacheKey });
      var spriteApplyStartedAt = nowMs();
      try {
        var transformOnlyScale = renderTransform && renderTransform.active === true ? toNumber(renderTransform.scale, 1) : 1;
        var baseX = cache.minX - padding;
        var baseY = cache.minY - padding;
        sprite.texture = cache.texture;
        sprite.x = renderTransform && renderTransform.active === true ? toNumber(renderTransform.spriteX, 0) + transformOnlyScale * baseX : baseX;
        sprite.y = renderTransform && renderTransform.active === true ? toNumber(renderTransform.spriteY, 0) + transformOnlyScale * baseY : baseY;
        if (sprite.scale) {
          sprite.scale.x = transformOnlyScale;
          sprite.scale.y = transformOnlyScale;
        }
        sprite.zIndex = group.minOrderIndex;
        sprite.visible = true;
        sprite.__pixiStaticWorldChunkKey = group.cacheKey;
        sprite.__pixiStaticWorldOrderRunCache = true;
        sprite.__pixiFramePlanOrderIndex = group.minOrderIndex;
        sprite.__pixiStaticWorldChunkTransformOnly = !!(renderTransform && renderTransform.active === true);
      } catch (_) {
        return Object.assign(plan, { ok: false, reason: 'order-run-sprite-update-failed', failedCacheKey: group.cacheKey });
      }
      orderRunSpriteApplyMs += Math.max(0, nowMs() - spriteApplyStartedAt);
      spriteIndex += 1;
    }
    emitRenderTextureChurnDiagnostics({
      frameSeq: state.frameSeq,
      kind: 'order-run-render-texture',
      groupCount: groups.length,
      hitCount: hitCount,
      missCount: missCount,
      uploadCount: missCount,
      createCount: orderRunRenderTextureCreateCount,
      destroyCount: orderRunRenderTextureDestroyCount,
      reusablePacketCount: reusablePacketCount,
      rebuildPacketCount: rebuildPacketCount,
      largestPacketCount: largestPacketCount,
      cacheSpace: renderTransform && renderTransform.active === true ? 'floor-build-screen-space' : 'current-screen-space',
      transformActive: !!(renderTransform && renderTransform.active === true),
      transformScale: roundDiag(renderTransform && renderTransform.active === true ? toNumber(renderTransform.scale, 1) : 1, 4),
      reasonCounts: orderRunRenderTextureMissReasonCounts,
      samples: orderRunRenderTextureMissSamples
    });
    return Object.assign(plan, {
      ok: true,
      renderer: 'pixi-static-world-order-run-render-texture-cache',
      orderRunRenderTextureActive: true,
      orderRunRenderTextureCount: groups.length,
      orderRunRenderTextureHitCount: hitCount,
      orderRunRenderTextureMissCount: missCount,
      orderRunRenderTextureHitRate: groups.length ? Number((hitCount / groups.length).toFixed(4)) : 1,
      orderRunRenderTextureReusablePacketCount: reusablePacketCount,
      orderRunRenderTextureRebuildPacketCount: rebuildPacketCount,
      orderRunRenderTextureCachedPacketCount: plan.cachedPacketCount,
      orderRunRenderTextureGraphicsPacketCount: plan.graphicsPacketCount,
      orderRunGraphicsItemsReboundToCurrentFrame: plan.graphicsItemsReboundToCurrentFrame === true,
      orderRunGraphicsItemsReboundCount: toNumber(plan.graphicsItemsReboundCount, orderRunGraphicsItemRebindSummary.reboundCount),
      orderRunGraphicsItemsRebindMissingCount: toNumber(plan.graphicsItemsRebindMissingCount, orderRunGraphicsItemRebindSummary.missingCount),
      orderRunRenderTextureLargestPacketCount: largestPacketCount,
      orderRunRenderTextureSpriteStartIndex: Math.max(0, toNumber(spriteStartIndex, 0)),
      orderRunRenderTextureSpriteEndIndex: spriteIndex,
      orderRunRenderTextureTransformOnlySprites: !!(renderTransform && renderTransform.active === true),
      orderRunRenderTextureCacheSpace: renderTransform && renderTransform.active === true ? 'floor-build-screen-space' : 'current-screen-space',
      orderRunRenderTextureCurrentCameraIndependent: !!(renderTransform && renderTransform.active === true),
      orderRunRenderTextureMinPacketCount: plan.minPacketCount,
      orderRunPlanBuildCount: orderRunPlanBuildCount,
      orderRunPlanReuseCount: orderRunPlanReuseCount,
      orderRunPlanCacheHitRate: orderRunPlanReuseCount ? 1 : 0,
      orderRunPlanBuildMs: Number(orderRunPlanBuildMs.toFixed(3)),
      orderRunPlanRebuildReason: orderRunPlanRebuildReason,
      orderRunRenderTextureCreateCount: orderRunRenderTextureCreateCount,
      orderRunRenderTextureReuseCount: hitCount,
      orderRunRenderTextureDestroyCount: orderRunRenderTextureDestroyCount,
      orderRunRenderTextureUploadCount: missCount,
      orderRunRenderTextureMissReasonCounts: orderRunRenderTextureMissReasonCounts,
      orderRunRenderTextureMissSamples: orderRunRenderTextureMissSamples,
      orderRunRenderTextureSignatureBuildMs: Number(orderRunSignatureBuildMs.toFixed(3)),
      orderRunRenderTextureCacheLookupMs: Number(orderRunCacheLookupMs.toFixed(3)),
      orderRunRenderTextureTextureCreateMs: Number(orderRunTextureCreateMs.toFixed(3)),
      orderRunRenderTextureGraphicsCreateMs: Number(orderRunGraphicsCreateMs.toFixed(3)),
      orderRunRenderTextureCommandDrawMs: Number(orderRunCommandDrawMs.toFixed(3)),
      orderRunRenderTextureRenderToTextureMs: Number(orderRunRenderToTextureMs.toFixed(3)),
      orderRunRenderTextureTextureDestroyMs: Number(orderRunTextureDestroyMs.toFixed(3)),
      orderRunRenderTextureSpriteApplyMs: Number(orderRunSpriteApplyMs.toFixed(3)),
      orderRunRenderTextureWallMs: Number(Math.max(0, nowMs() - startedAt).toFixed(3))
    });
  }

  function getPacketProjectedGeometry(packet, viewRotation, deps) {
    var api = getProjectedGeometryApi();
    if (!api || typeof api.getStaticWorldPacketProjectedGeometry !== 'function') return null;
    return api.getStaticWorldPacketProjectedGeometry(packet, viewRotation, deps);
  }

  function isSupportedPacket(packet) {
    return !!(packet && packet.kind === 'static-world-face-packet' && (Array.isArray(packet.worldPts) || Array.isArray(packet.worldLoops)));
  }


  function stableString(value) {
    try { return JSON.stringify(value); } catch (_) { return String(value); }
  }

  function addUniqueSample(list, sample, limit) {
    if (!Array.isArray(list) || !sample) return;
    limit = Math.max(1, Number(limit || 8));
    if (list.length >= limit) return;
    list.push(sample);
  }


  function hashDiagnosticText(value) {
    return String((hashString32(2166136261, value == null ? '' : String(value)) >>> 0).toString(36));
  }

  function extractSignatureToken(signature, prefix) {
    var parts = String(signature || '').split('|');
    for (var i = 0; i < parts.length; i += 1) {
      if (parts[i].indexOf(prefix) === 0) return parts[i].slice(prefix.length);
    }
    return '';
  }

  function summarizeSignatureDelta(previousSignature, currentSignature) {
    var prev = String(previousSignature || '');
    var curr = String(currentSignature || '');
    var prevParts = prev ? prev.split('|') : [];
    var currParts = curr ? curr.split('|') : [];
    var max = Math.max(prevParts.length, currParts.length);
    var firstDiffIndex = -1;
    for (var i = 0; i < max; i += 1) {
      if (String(prevParts[i] || '') !== String(currParts[i] || '')) { firstDiffIndex = i; break; }
    }
    var prevBounds = extractSignatureToken(prev, 'bounds=');
    var currBounds = extractSignatureToken(curr, 'bounds=');
    var prevPackets = extractSignatureToken(prev, 'packets=');
    var currPackets = extractSignatureToken(curr, 'packets=');
    return {
      previousSignatureHash: hashDiagnosticText(prev),
      currentSignatureHash: hashDiagnosticText(curr),
      previousPartCount: prevParts.length,
      currentPartCount: currParts.length,
      firstDiffIndex: firstDiffIndex,
      previousFirstDiff: firstDiffIndex >= 0 ? String(prevParts[firstDiffIndex] || '').slice(0, 96) : '',
      currentFirstDiff: firstDiffIndex >= 0 ? String(currParts[firstDiffIndex] || '').slice(0, 96) : '',
      previousBounds: prevBounds,
      currentBounds: currBounds,
      boundsChanged: prevBounds !== currBounds,
      previousPackets: prevPackets,
      currentPackets: currPackets,
      packetCountChanged: prevPackets !== currPackets
    };
  }

  function buildRenderTextureCacheMeta(renderTransform) {
    var active = !!(renderTransform && renderTransform.active === true);
    return {
      cacheSpace: active ? 'floor-build-screen-space' : 'current-screen-space',
      transformActive: active,
      transformScale: roundDiag(active ? toNumber(renderTransform && renderTransform.scale, 1) : 1, 4),
      transformSpriteX: roundDiag(active ? toNumber(renderTransform && renderTransform.spriteX, 0) : 0, 3),
      transformSpriteY: roundDiag(active ? toNumber(renderTransform && renderTransform.spriteY, 0) : 0, 3),
      floorBuildCameraX: roundDiag(active ? toNumber(renderTransform && renderTransform.floorBuildCameraX, 0) : 0, 3),
      floorBuildCameraY: roundDiag(active ? toNumber(renderTransform && renderTransform.floorBuildCameraY, 0) : 0, 3),
      floorBuildZoom: roundDiag(active ? toNumber(renderTransform && renderTransform.floorBuildZoom, 1) : 1, 4)
    };
  }

  function classifyRenderTextureMiss(cache, signature, width, height, meta) {
    var reasons = [];
    if (!cache) reasons.push('cache-missing');
    else {
      if (!cache.texture) reasons.push('texture-missing');
      if (cache.signature !== signature) reasons.push('signature-mismatch');
      if (Math.ceil(toNumber(cache.width, 0)) !== Math.ceil(toNumber(width, 0)) || Math.ceil(toNumber(cache.height, 0)) !== Math.ceil(toNumber(height, 0))) reasons.push('dimension-mismatch');
      if (cache.cacheSpace != null && meta && String(cache.cacheSpace) !== String(meta.cacheSpace)) reasons.push('cache-space-changed');
      if (cache.transformActive != null && meta && !!cache.transformActive !== !!meta.transformActive) reasons.push('transform-active-changed');
      if (cache.transformScale != null && meta && Number(cache.transformScale) !== Number(meta.transformScale)) reasons.push('transform-scale-changed');
      if (cache.floorBuildCameraX != null && meta && (Number(cache.floorBuildCameraX) !== Number(meta.floorBuildCameraX) || Number(cache.floorBuildCameraY) !== Number(meta.floorBuildCameraY))) reasons.push('floor-build-camera-changed');
      if (cache.floorBuildZoom != null && meta && Number(cache.floorBuildZoom) !== Number(meta.floorBuildZoom)) reasons.push('floor-build-zoom-changed');
    }
    if (!reasons.length) reasons.push('unknown-miss');
    return reasons.join('+');
  }

  function buildRenderTextureMissDiagnostic(kind, key, cache, signature, width, height, group, renderTransform) {
    var meta = buildRenderTextureCacheMeta(renderTransform);
    var reason = classifyRenderTextureMiss(cache, signature, width, height, meta);
    var delta = summarizeSignatureDelta(cache && cache.signature, signature);
    return {
      kind: String(kind || ''),
      key: String(key || '').slice(0, 120),
      reason: reason,
      packetCount: toNumber(group && group.packetCount, 0),
      commandCount: Array.isArray(group && group.commands) ? group.commands.length : toNumber(group && group.commandCount, 0),
      width: Math.ceil(toNumber(width, 0)),
      height: Math.ceil(toNumber(height, 0)),
      previousWidth: cache && cache.width != null ? Math.ceil(toNumber(cache.width, 0)) : 0,
      previousHeight: cache && cache.height != null ? Math.ceil(toNumber(cache.height, 0)) : 0,
      cacheSpace: meta.cacheSpace,
      previousCacheSpace: cache && cache.cacheSpace != null ? String(cache.cacheSpace) : '',
      transformActive: meta.transformActive,
      transformScale: meta.transformScale,
      previousTransformScale: cache && cache.transformScale != null ? cache.transformScale : null,
      floorBuildCameraX: meta.floorBuildCameraX,
      floorBuildCameraY: meta.floorBuildCameraY,
      previousFloorBuildCameraX: cache && cache.floorBuildCameraX != null ? cache.floorBuildCameraX : null,
      previousFloorBuildCameraY: cache && cache.floorBuildCameraY != null ? cache.floorBuildCameraY : null,
      floorBuildZoom: meta.floorBuildZoom,
      previousFloorBuildZoom: cache && cache.floorBuildZoom != null ? cache.floorBuildZoom : null,
      boundsChanged: delta.boundsChanged,
      packetCountChanged: delta.packetCountChanged,
      firstDiffIndex: delta.firstDiffIndex,
      previousFirstDiff: delta.previousFirstDiff,
      currentFirstDiff: delta.currentFirstDiff,
      previousSignatureHash: delta.previousSignatureHash,
      currentSignatureHash: delta.currentSignatureHash,
      previousBounds: delta.previousBounds,
      currentBounds: delta.currentBounds,
      samplePacketIds: Array.isArray(group && group.samplePacketIds) ? group.samplePacketIds.slice(0, 4) : []
    };
  }

  function assignRenderTextureCacheMeta(cache, renderTransform) {
    if (!cache) return cache;
    var meta = buildRenderTextureCacheMeta(renderTransform);
    cache.cacheSpace = meta.cacheSpace;
    cache.transformActive = meta.transformActive;
    cache.transformScale = meta.transformScale;
    cache.transformSpriteX = meta.transformSpriteX;
    cache.transformSpriteY = meta.transformSpriteY;
    cache.floorBuildCameraX = meta.floorBuildCameraX;
    cache.floorBuildCameraY = meta.floorBuildCameraY;
    cache.floorBuildZoom = meta.floorBuildZoom;
    return cache;
  }

  function emitRenderTextureChurnDiagnostics(payload) {
    payload = payload || {};
    var missCount = toNumber(payload.missCount, 0);
    var uploadCount = toNumber(payload.uploadCount, missCount);
    if (missCount <= 0 && uploadCount <= 0) return;
    var samples = Array.isArray(payload.samples) ? payload.samples : [];
    var signature = [payload.kind, missCount, uploadCount, payload.hitCount, payload.groupCount, JSON.stringify(payload.reasonCounts || {}), samples.map(function (s) { return [s.key, s.reason, s.currentSignatureHash, s.previousSignatureHash].join(':'); }).join(';')].join('|');
    var elapsed = nowMs() - toNumber(state.lastRenderTextureChurnDiagnosticsEmitAt, 0);
    if (signature === state.lastRenderTextureChurnDiagnosticsSignature && elapsed < 500) return;
    state.lastRenderTextureChurnDiagnosticsSignature = signature;
    state.lastRenderTextureChurnDiagnosticsEmitAt = nowMs();
    emit('rendertexture-churn-diagnostics', payload);
  }

  function getPacketSourceBox(packet) {
    try { return packet && packet.box ? packet.box : null; } catch (_) {}
    return null;
  }

  function isTerrainStaticFacePacket(packet) {
    if (!(packet && packet.kind === 'static-world-face-packet')) return false;
    var box = getPacketSourceBox(packet);
    var generatedBy = box && box.generatedBy != null ? String(box.generatedBy) : '';
    var id = packet.id != null ? String(packet.id) : '';
    var instanceId = packet.instanceId != null ? String(packet.instanceId) : '';
    if (generatedBy === 'terrain-generator') return true;
    if (packet.terrainMaterialId != null || packet.terrainMaterialLabel != null || packet.terrainMaterialMergeKey != null) return true;
    if (box && (box.terrainMaterialId != null || box.terrainMaterialLabel != null || box.terrainMaterialMergeKey != null)) return true;
    if (id.indexOf('voxel-merge-terrain-') === 0 || id.indexOf('terrain-') === 0) return true;
    if (instanceId.indexOf('terrain-') === 0) return true;
    return false;
  }

  function isVoxelizedPrefabStaticFacePacket(packet) {
    if (!(packet && packet.kind === 'static-world-face-packet')) return false;
    if (isTerrainStaticFacePacket(packet)) return false;
    var box = getPacketSourceBox(packet);
    return !!(packet.prefabId || packet.instanceId || (box && (box.prefabId || box.instanceId)));
  }

  function collectPacketWorldPoints(packet) {
    var points = [];
    try {
      if (Array.isArray(packet && packet.worldPts)) {
        for (var i = 0; i < packet.worldPts.length; i += 1) if (packet.worldPts[i]) points.push(packet.worldPts[i]);
      }
      if (Array.isArray(packet && packet.worldLoops)) {
        for (var li = 0; li < packet.worldLoops.length; li += 1) {
          var loop = packet.worldLoops[li];
          if (!Array.isArray(loop)) continue;
          for (var pi = 0; pi < loop.length; pi += 1) if (loop[pi]) points.push(loop[pi]);
        }
      }
    } catch (_) {}
    return points;
  }

  function estimatePointDepthValue(pt) {
    return toNumber(pt && pt.x, 0) + toNumber(pt && pt.y, 0) + toNumber(pt && pt.z, 0);
  }

  function estimateStaticPacketDepthSpan(packet) {
    var points = collectPacketWorldPoints(packet);
    var minDepth = Infinity;
    var maxDepth = -Infinity;
    for (var i = 0; i < points.length; i += 1) {
      var d = estimatePointDepthValue(points[i]);
      if (d < minDepth) minDepth = d;
      if (d > maxDepth) maxDepth = d;
    }
    var geometricDepthSpan = (Number.isFinite(minDepth) && Number.isFinite(maxDepth)) ? Math.max(0, maxDepth - minDepth) : 0;
    var mergeSpan = Math.max(0, Math.max(toNumber(packet && packet.mergeWidth, 1), toNumber(packet && packet.mergeHeight, 1)) - 1);
    return Math.max(geometricDepthSpan, mergeSpan);
  }

  function estimateStaticPacketCellSpan(packet) {
    return Math.max(1, Math.max(toNumber(packet && packet.mergeWidth, 1), toNumber(packet && packet.mergeHeight, 1), Math.sqrt(Math.max(1, toNumber(packet && packet.mergedFaceCount, 1)))));
  }

  function getRenderableWorldBoundsSpan(renderable) {
    var bounds = renderable && renderable.worldBounds ? renderable.worldBounds : null;
    if (!bounds) return { spanX: 0, spanY: 0, maxSpan: 0 };
    var spanX = Math.max(0, toNumber(bounds.maxX, toNumber(bounds.minX, 0)) - toNumber(bounds.minX, 0));
    var spanY = Math.max(0, toNumber(bounds.maxY, toNumber(bounds.minY, 0)) - toNumber(bounds.minY, 0));
    return { spanX: spanX, spanY: spanY, maxSpan: Math.max(spanX, spanY) };
  }

  function classifyStaticWorldFacePacket(packet) {
    var terrain = isTerrainStaticFacePacket(packet);
    var voxelizedPrefab = isVoxelizedPrefabStaticFacePacket(packet);
    var depthSpan = estimateStaticPacketDepthSpan(packet);
    var cellSpan = estimateStaticPacketCellSpan(packet);
    var merged = !!(packet && packet.mergedFace === true);
    var category = terrain ? 'terrain-face-packet' : (voxelizedPrefab ? 'voxelized-prefab-face-packet' : 'generic-static-face-packet');
    return {
      category: category,
      terrain: terrain,
      voxelizedPrefab: voxelizedPrefab,
      genericStaticFace: !terrain && !voxelizedPrefab,
      merged: merged,
      cellSpan: Number(cellSpan.toFixed ? cellSpan.toFixed(3) : cellSpan),
      depthSpan: Number(depthSpan.toFixed ? depthSpan.toFixed(3) : depthSpan),
      depthInterval: depthSpan > 1.25 || cellSpan > 1.25,
      chunkKey: packet && packet.chunkKey ? String(packet.chunkKey) : '',
      prefabId: packet && packet.prefabId ? String(packet.prefabId) : '',
      instanceId: packet && packet.instanceId ? String(packet.instanceId) : '',
      semanticFace: packet && packet.semanticFace ? String(packet.semanticFace) : '',
      packetId: packet && packet.id ? String(packet.id) : ''
    };
  }

  function classifyNonStaticRenderable(renderable) {
    var kind = renderable && renderable.kind ? String(renderable.kind) : 'unknown';
    var boundsSpan = getRenderableWorldBoundsSpan(renderable);
    var isAtomicSprite = kind === 'prefab-sprite';
    var isSplitSpritePart = kind === 'prefab-sprite-part';
    var isBillboardSprite = isAtomicSprite || isSplitSpritePart;
    var isPlayer = kind === 'player-avatar';
    var largeAtomic = isAtomicSprite && boundsSpan.maxSpan > 1.25;
    return {
      category: isPlayer ? 'player-avatar' : (isSplitSpritePart ? 'sprite-split-part' : (isAtomicSprite ? 'atomic-billboard-sprite' : 'dynamic-or-other-renderable')),
      kind: kind,
      atomicSprite: isAtomicSprite,
      splitSpritePart: isSplitSpritePart,
      billboardSprite: isBillboardSprite,
      largeAtomicSprite: largeAtomic,
      depthInterval: largeAtomic,
      player: isPlayer,
      dynamicBarrier: !isPlayer && kind !== 'static-world-face-packet',
      worldBoundsSpanX: Number(boundsSpan.spanX.toFixed ? boundsSpan.spanX.toFixed(3) : boundsSpan.spanX),
      worldBoundsSpanY: Number(boundsSpan.spanY.toFixed ? boundsSpan.spanY.toFixed(3) : boundsSpan.spanY),
      worldBoundsMaxSpan: Number(boundsSpan.maxSpan.toFixed ? boundsSpan.maxSpan.toFixed(3) : boundsSpan.maxSpan),
      prefabId: renderable && renderable.prefabId ? String(renderable.prefabId) : '',
      instanceId: renderable && renderable.instanceId ? String(renderable.instanceId) : '',
      renderableId: renderable && renderable.id ? String(renderable.id) : ''
    };
  }

  function incrementObjectCount(target, key, amount) {
    if (!target) return;
    key = String(key || 'unknown');
    target[key] = Number(target[key] || 0) + (amount == null ? 1 : Number(amount || 0));
  }

  function buildAssetRenderableClassificationDiagnostics(order, runs) {
    order = Array.isArray(order) ? order : [];
    runs = Array.isArray(runs) ? runs : [];
    var out = {
      ok: true,
      step: STEP,
      phase: PHASE,
      mode: 'diagnostics-only',
      visualChange: false,
      activeBackend: getActiveBackend(),
      totalRenderableCount: order.length,
      staticOrderRunCount: runs.length,
      staticPacketCount: 0,
      terrainFacePacketCount: 0,
      voxelizedPrefabFacePacketCount: 0,
      genericStaticFacePacketCount: 0,
      mergedStaticFacePacketCount: 0,
      largeMergedStaticPacketCount: 0,
      depthIntervalStaticPacketCount: 0,
      atomicSpriteCount: 0,
      largeAtomicSpriteCount: 0,
      billboardSpriteCount: 0,
      splitSpritePartCount: 0,
      playerRenderableCount: 0,
      dynamicOrOtherRenderableCount: 0,
      dynamicBarrierRenderableCount: 0,
      depthIntervalAtomicSpriteCount: 0,
      depthIntervalObjectCount: 0,
      maxStaticPacketDepthSpan: 0,
      maxStaticPacketCellSpan: 0,
      maxAtomicSpriteWorldSpan: 0,
      staticPacketSourceCounts: {},
      renderableKindCounts: {},
      chunkStaticPacketCounts: {},
      chunkTerrainPacketCounts: {},
      chunkVoxelizedPrefabPacketCounts: {},
      samples: {
        terrainFacePackets: [],
        voxelizedPrefabFacePackets: [],
        genericStaticFacePackets: [],
        depthIntervalStaticPackets: [],
        atomicSprites: [],
        largeAtomicSprites: [],
        splitSpriteParts: [],
        dynamicBarriers: []
      }
    };
    for (var i = 0; i < order.length; i += 1) {
      var item = order[i];
      var kind = item && item.kind ? String(item.kind) : 'unknown';
      incrementObjectCount(out.renderableKindCounts, kind, 1);
      if (kind === 'static-world-face-packet') {
        var pc = classifyStaticWorldFacePacket(item);
        out.staticPacketCount += 1;
        incrementObjectCount(out.staticPacketSourceCounts, pc.category, 1);
        if (pc.chunkKey) incrementObjectCount(out.chunkStaticPacketCounts, pc.chunkKey, 1);
        if (pc.terrain) {
          out.terrainFacePacketCount += 1;
          if (pc.chunkKey) incrementObjectCount(out.chunkTerrainPacketCounts, pc.chunkKey, 1);
          addUniqueSample(out.samples.terrainFacePackets, { orderIndex: i, packetId: pc.packetId, chunkKey: pc.chunkKey, semanticFace: pc.semanticFace, merged: pc.merged, cellSpan: pc.cellSpan, depthSpan: pc.depthSpan }, 6);
        } else if (pc.voxelizedPrefab) {
          out.voxelizedPrefabFacePacketCount += 1;
          if (pc.chunkKey) incrementObjectCount(out.chunkVoxelizedPrefabPacketCounts, pc.chunkKey, 1);
          addUniqueSample(out.samples.voxelizedPrefabFacePackets, { orderIndex: i, packetId: pc.packetId, prefabId: pc.prefabId, instanceId: pc.instanceId, chunkKey: pc.chunkKey, semanticFace: pc.semanticFace, merged: pc.merged, cellSpan: pc.cellSpan, depthSpan: pc.depthSpan }, 8);
        } else {
          out.genericStaticFacePacketCount += 1;
          addUniqueSample(out.samples.genericStaticFacePackets, { orderIndex: i, packetId: pc.packetId, chunkKey: pc.chunkKey, semanticFace: pc.semanticFace, merged: pc.merged, cellSpan: pc.cellSpan, depthSpan: pc.depthSpan }, 8);
        }
        if (pc.merged) out.mergedStaticFacePacketCount += 1;
        if (pc.merged && pc.cellSpan > 1.25) out.largeMergedStaticPacketCount += 1;
        if (pc.depthInterval) {
          out.depthIntervalStaticPacketCount += 1;
          addUniqueSample(out.samples.depthIntervalStaticPackets, { orderIndex: i, category: pc.category, packetId: pc.packetId, prefabId: pc.prefabId, chunkKey: pc.chunkKey, semanticFace: pc.semanticFace, merged: pc.merged, cellSpan: pc.cellSpan, depthSpan: pc.depthSpan }, 10);
        }
        out.maxStaticPacketDepthSpan = Math.max(out.maxStaticPacketDepthSpan, pc.depthSpan);
        out.maxStaticPacketCellSpan = Math.max(out.maxStaticPacketCellSpan, pc.cellSpan);
        continue;
      }
      var rc = classifyNonStaticRenderable(item);
      if (rc.atomicSprite) {
        out.atomicSpriteCount += 1;
        addUniqueSample(out.samples.atomicSprites, { orderIndex: i, renderableId: rc.renderableId, prefabId: rc.prefabId, instanceId: rc.instanceId, worldBoundsMaxSpan: rc.worldBoundsMaxSpan }, 8);
      }
      if (rc.largeAtomicSprite) {
        out.largeAtomicSpriteCount += 1;
        out.depthIntervalAtomicSpriteCount += 1;
        addUniqueSample(out.samples.largeAtomicSprites, { orderIndex: i, renderableId: rc.renderableId, prefabId: rc.prefabId, instanceId: rc.instanceId, worldBoundsSpanX: rc.worldBoundsSpanX, worldBoundsSpanY: rc.worldBoundsSpanY, worldBoundsMaxSpan: rc.worldBoundsMaxSpan }, 10);
      }
      if (rc.billboardSprite) out.billboardSpriteCount += 1;
      if (rc.splitSpritePart) {
        out.splitSpritePartCount += 1;
        addUniqueSample(out.samples.splitSpriteParts, { orderIndex: i, renderableId: rc.renderableId, prefabId: rc.prefabId, instanceId: rc.instanceId, worldBoundsMaxSpan: rc.worldBoundsMaxSpan }, 8);
      }
      if (rc.player) out.playerRenderableCount += 1;
      else out.dynamicOrOtherRenderableCount += 1;
      if (rc.dynamicBarrier) {
        out.dynamicBarrierRenderableCount += 1;
        addUniqueSample(out.samples.dynamicBarriers, { orderIndex: i, kind: rc.kind, renderableId: rc.renderableId, prefabId: rc.prefabId, instanceId: rc.instanceId, category: rc.category }, 10);
      }
      out.maxAtomicSpriteWorldSpan = Math.max(out.maxAtomicSpriteWorldSpan, rc.worldBoundsMaxSpan);
    }
    out.depthIntervalObjectCount = Number(out.depthIntervalStaticPacketCount || 0) + Number(out.depthIntervalAtomicSpriteCount || 0);
    out.voxelizedStaticPacketCount = Number(out.terrainFacePacketCount || 0) + Number(out.voxelizedPrefabFacePacketCount || 0) + Number(out.genericStaticFacePacketCount || 0);
    out.safeFacePacketModelCoverageRate = out.staticPacketCount ? Number((out.voxelizedStaticPacketCount / out.staticPacketCount).toFixed(4)) : 0;
    out.atomicSpriteRiskLevel = out.largeAtomicSpriteCount > 0 ? 'has-large-atomic-sprites' : (out.atomicSpriteCount > 0 ? 'has-small-atomic-sprites' : 'none');
    out.voxelizedAssetModelDominant = out.staticPacketCount > 0 && (out.terrainFacePacketCount + out.voxelizedPrefabFacePacketCount) / out.staticPacketCount >= 0.95;
    out.maxStaticPacketDepthSpan = Number(out.maxStaticPacketDepthSpan.toFixed ? out.maxStaticPacketDepthSpan.toFixed(3) : out.maxStaticPacketDepthSpan);
    out.maxStaticPacketCellSpan = Number(out.maxStaticPacketCellSpan.toFixed ? out.maxStaticPacketCellSpan.toFixed(3) : out.maxStaticPacketCellSpan);
    out.maxAtomicSpriteWorldSpan = Number(out.maxAtomicSpriteWorldSpan.toFixed ? out.maxAtomicSpriteWorldSpan.toFixed(3) : out.maxAtomicSpriteWorldSpan);
    return out;
  }

  function emitAssetRenderableClassificationDiagnostics(summary) {
    if (!summary) return;
    var signature = [
      summary.totalRenderableCount,
      summary.staticPacketCount,
      summary.terrainFacePacketCount,
      summary.voxelizedPrefabFacePacketCount,
      summary.atomicSpriteCount,
      summary.largeAtomicSpriteCount,
      summary.billboardSpriteCount,
      summary.depthIntervalObjectCount,
      summary.staticOrderRunCount,
      stableString(summary.renderableKindCounts),
      stableString(summary.staticPacketSourceCounts)
    ].join('|');
    var now = nowMs();
    if (signature === state.lastAssetClassificationSignature && (now - Number(state.lastAssetClassificationEmitAt || 0)) < 5000) return;
    state.lastAssetClassificationSignature = signature;
    state.lastAssetClassificationEmitAt = now;
    state.lastAssetClassificationSummary = summary;
    emit('asset-classification', summary);
  }

  function collectStaticRuns(order) {
    order = Array.isArray(order) ? order : [];
    var runs = [];
    var i = 0;
    while (i < order.length) {
      var item = order[i];
      if (!(item && item.kind === 'static-world-face-packet')) {
        i += 1;
        continue;
      }
      var runStart = i;
      var packets = [];
      while (i < order.length) {
        var maybe = order[i];
        if (!(maybe && maybe.kind === 'static-world-face-packet')) break;
        packets.push(maybe);
        i += 1;
      }
      runs.push({ runStartIndex: runStart, packets: packets });
    }
    return runs;
  }

  function drawPacket(graphics, packet, projected, camera, renderTransform, deps) {
    if (!graphics || !packet || !projected) return { ok: false, reason: 'missing-input' };
    var loops = Array.isArray(projected.loopsNoCamera) ? projected.loopsNoCamera : [];
    var points = Array.isArray(projected.pointsNoCamera) ? projected.pointsNoCamera : [];
    var polygonDrawCount = 0;
    if (loops.length) {
      for (var li = 0; li < loops.length; li += 1) {
        var loopPts = mapNoCameraPointsToFinalScreenPoints(loops[li], camera, renderTransform, deps);
        if (loopPts.length >= 3 && drawPolygon(graphics, loopPts, packet.fill, packet.stroke, packet.width || 1)) polygonDrawCount += 1;
      }
    } else {
      var pts = mapNoCameraPointsToFinalScreenPoints(points, camera, renderTransform, deps);
      if (pts.length >= 3 && drawPolygon(graphics, pts, packet.fill, packet.stroke, packet.width || 1)) polygonDrawCount += 1;
    }
    var outlineSegments = Array.isArray(projected.outlineSegmentsNoCamera) ? projected.outlineSegmentsNoCamera : [];
    var outlineCount = 0;
    if (packet.stroke && outlineSegments.length) {
      for (var oi = 0; oi < outlineSegments.length; oi += 1) {
        var seg = outlineSegments[oi];
        if (Array.isArray(seg) && seg[0] && seg[1]) {
          if (drawSegment(graphics, mapNoCameraPointToFinalScreenPoint(seg[0], camera, renderTransform, deps), mapNoCameraPointToFinalScreenPoint(seg[1], camera, renderTransform, deps), packet.stroke, packet.width || 1)) outlineCount += 1;
        }
      }
    }
    var terrainBoundarySegments = Array.isArray(projected.terrainBoundarySegmentsNoCamera) ? projected.terrainBoundarySegmentsNoCamera : [];
    var boundaryCount = 0;
    if (packet.terrainBoundaryStroke && packet.terrainBoundaryStrokeWidth && terrainBoundarySegments.length) {
      for (var bi = 0; bi < terrainBoundarySegments.length; bi += 1) {
        var bseg = terrainBoundarySegments[bi];
        if (Array.isArray(bseg) && bseg[0] && bseg[1]) {
          if (drawSegment(graphics, mapNoCameraPointToFinalScreenPoint(bseg[0], camera, renderTransform, deps), mapNoCameraPointToFinalScreenPoint(bseg[1], camera, renderTransform, deps), packet.terrainBoundaryStroke, packet.terrainBoundaryStrokeWidth)) boundaryCount += 1;
        }
      }
    }
    var overlayCount = drawProjectedOverlays(graphics, packet, projected, camera, renderTransform, deps);
    return {
      ok: polygonDrawCount > 0,
      polygonDrawCount: polygonDrawCount,
      outlineCount: outlineCount,
      terrainBoundaryCount: boundaryCount,
      overlayCount: overlayCount
    };
  }


  function safeRoundForSignature(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    var factor = Math.pow(10, digits == null ? 4 : digits);
    return Math.round(n * factor) / factor;
  }

  function buildPacketPersistentGraphicsSignature(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps, staticViewRotation) {
    var shared = getSharedRenderFrameSnapshot();
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    var parts = [
      'persistent-graphics-v=07.13B',
      'packet=' + String(packet && packet.id || ''),
      'run=' + String(runStartIndex),
      'packetIndex=' + String(packetIndex),
      'fill=' + String(packet && packet.fill || ''),
      'stroke=' + String(packet && packet.stroke || ''),
      'width=' + String(packet && packet.width || 1),
      'terrainStroke=' + String(packet && packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet && packet.terrainBoundaryStrokeWidth || 0),
      'projectedKey=' + String(projected && projected.key || ''),
      'overlayCount=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : (Array.isArray(projected && projected.overlaysNoCamera) ? projected.overlaysNoCamera.length : 0)),
      'renderTransformActive=' + String(!!(renderTransform && renderTransform.active === true)),
      'currentCamera=' + safeRoundForSignature(camera && camera.x, 3) + ',' + safeRoundForSignature(camera && camera.y, 3),
      'reuseScale=' + safeRoundForSignature(renderTransform && renderTransform.scale, 6),
      'reuseSprite=' + safeRoundForSignature(renderTransform && renderTransform.spriteX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.spriteY, 3),
      'reuseBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'reuseBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'floorTextureVersion=' + getStaticFloorTextureVersionForCache(floorSnapshot, staticViewRotation),
      'floorTransformScale=' + safeRoundForSignature(transform && transform.scale, 6),
      'floorTransformDxDy=' + safeRoundForSignature(transform && transform.dx, 3) + ',' + safeRoundForSignature(transform && transform.dy, 3),
      'floorReuseCameraOnly=' + String(!!(reuse && reuse.cameraTransformOnly === true)),
      'sharedFrameId=' + String(shared && shared.frameId || ''),
      'sharedFramePlanId=' + String(shared && shared.framePlanId || '')
    ];
    return parts.join('|');
  }


  function buildPacketChunkTextureSignature(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps) {
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    var parts = [
      'chunk-packet-v=07.14K',
      'packet=' + String(packet && packet.id || ''),
      // Do not include runStartIndex or packetIndex in the chunk texture
      // signature. Those are framePlan placement artifacts and can move when
      // the player moves, even for chunks outside the active player chunk.
      // The texture content should only depend on packet geometry/material and
      // stable projection/cache state. Sprite zIndex is still updated every
      // frame from group.minOrderIndex, but the texture itself should not miss.
      'face=' + String(packet && packet.semanticFace || '') + '/' + String(packet && packet.screenFace || ''),
      'faceKey=' + String(packet && packet.faceKey || ''),
      'depth=' + String(packet && packet.depthKey != null ? packet.depthKey : ''),
      'fill=' + String(packet && packet.fill || ''),
      'stroke=' + String(packet && packet.stroke || ''),
      'width=' + String(packet && packet.width || 1),
      'terrainStroke=' + String(packet && packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet && packet.terrainBoundaryStrokeWidth || 0),
      'overlayCount=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : (Array.isArray(projected && projected.overlaysNoCamera) ? projected.overlaysNoCamera.length : 0)),
      'worldPts=' + String(Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0),
      'worldLoops=' + String(Array.isArray(packet && packet.worldLoops) ? packet.worldLoops.length : 0),
      'cacheSpace=' + String(renderTransform && renderTransform.active === true ? 'floor-build-screen' : 'current-screen'),
      'floorBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'floorBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'faceMerge=' + String(faceMerge && faceMerge.effectiveFaceMergeMode || ''),
      'pendingFaceMerge=' + String(faceMerge && faceMerge.pendingFaceMergeMode || '')
    ];
    return parts.join('|');
  }


  function getPacketWorldFingerprintForCache(packet) {
    var parts = [];
    try {
      var pts = Array.isArray(packet && packet.worldPts) ? packet.worldPts : [];
      if (pts.length) {
        var first = pts[0] || {};
        var last = pts[pts.length - 1] || {};
        parts.push('pts=' + String(pts.length));
        parts.push('p0=' + safeRoundForSignature(first.x, 3) + ',' + safeRoundForSignature(first.y, 3) + ',' + safeRoundForSignature(first.z, 3));
        parts.push('pN=' + safeRoundForSignature(last.x, 3) + ',' + safeRoundForSignature(last.y, 3) + ',' + safeRoundForSignature(last.z, 3));
      } else {
        parts.push('pts=0');
      }
      var loops = Array.isArray(packet && packet.worldLoops) ? packet.worldLoops : [];
      parts.push('loops=' + String(loops.length));
      if (loops.length && Array.isArray(loops[0]) && loops[0].length) {
        var lf = loops[0][0] || {};
        var ll = loops[loops.length - 1] && loops[loops.length - 1][loops[loops.length - 1].length - 1] || {};
        parts.push('l0=' + safeRoundForSignature(lf.x, 3) + ',' + safeRoundForSignature(lf.y, 3) + ',' + safeRoundForSignature(lf.z, 3));
        parts.push('lN=' + safeRoundForSignature(ll.x, 3) + ',' + safeRoundForSignature(ll.y, 3) + ',' + safeRoundForSignature(ll.z, 3));
      }
    } catch (_) {}
    return parts.join(';');
  }

  function buildStaticPacketItemBaseCacheKey(packet, renderTransform, viewRotation, deps) {
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    var keyParts = [
      'static-item-base-v=07.18I',
      'packet=' + String(packet && packet.id || ''),
      'instance=' + String(packet && packet.instanceId || ''),
      'prefab=' + String(packet && packet.prefabId || ''),
      'chunk=' + String(getPacketChunkKey(packet)),
      'face=' + String(packet && packet.semanticFace || '') + '/' + String(packet && packet.screenFace || ''),
      'faceKey=' + String(packet && packet.faceKey || ''),
      'cell=' + safeRoundForSignature(packet && packet.cellX, 3) + ',' + safeRoundForSignature(packet && packet.cellY, 3) + ',' + safeRoundForSignature(packet && packet.cellZ, 3),
      'sortDepth=' + safeRoundForSignature(packet && packet.sortKey, 3) + ',' + safeRoundForSignature(packet && packet.depthKey, 3),
      'merge=' + String(packet && packet.mergedFace === true) + ',' + String(packet && packet.mergedFaceCount || '') + ',' + String(packet && packet.mergeWidth || '') + ',' + String(packet && packet.mergeHeight || ''),
      'fill=' + String(packet && packet.fill || ''),
      'stroke=' + String(packet && packet.stroke || ''),
      'width=' + String(packet && packet.width || 1),
      'terrainStroke=' + String(packet && packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet && packet.terrainBoundaryStrokeWidth || 0),
      'overlayCount=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : ''),
      'world=' + getPacketWorldFingerprintForCache(packet),
      'viewRotation=' + safeRoundForSignature(viewRotation, 3),
      'cacheSpace=' + String(renderTransform && renderTransform.active === true ? 'floor-build-screen' : 'current-screen'),
      'floorBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'floorBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'faceMerge=' + String(faceMerge && faceMerge.effectiveFaceMergeMode || ''),
      'pendingFaceMerge=' + String(faceMerge && faceMerge.pendingFaceMergeMode || '')
    ];
    if (!(renderTransform && renderTransform.active === true)) {
      var camera = getCamera(deps);
      keyParts.push('currentCamera=' + safeRoundForSignature(camera && camera.x, 3) + ',' + safeRoundForSignature(camera && camera.y, 3));
    }
    return keyParts.join('|');
  }

  function getStaticPacketItemBaseCacheLimit() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticPacketItemBaseCacheLimit'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 256) n = 20000;
    return Math.max(256, Math.min(50000, Math.floor(n)));
  }

  function getStaticPacketItemBasePruneEveryFrames() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticPacketItemBasePruneEveryFrames'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 1) n = 60;
    return Math.max(1, Math.min(600, Math.floor(n)));
  }

  function countOwnKeys(obj) {
    if (!obj) return 0;
    try { return Object.keys(obj).length; } catch (_) {}
    var count = 0;
    try { for (var key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) count += 1; } catch (_) {}
    return count;
  }

  function pruneStaticPacketItemBaseCache(activeKeys) {
    var cache = state.staticPacketItemBaseCache || null;
    if (!cache) {
      state.lastStaticPacketItemBasePruneResult = { removed: 0, size: 0, skipped: true, reason: 'cache-missing', activeKeyCount: 0, cacheKeyCount: 0, limit: 0, effectiveLimit: 0 };
      return state.lastStaticPacketItemBasePruneResult;
    }

    var frameSeq = toNumber(state.frameSeq, 0);
    var pruneEvery = getStaticPacketItemBasePruneEveryFrames();
    var previous = state.lastStaticPacketItemBasePruneResult || null;
    if (previous && frameSeq > 0 && state.lastStaticPacketItemBasePruneFrameSeq > 0 && frameSeq - state.lastStaticPacketItemBasePruneFrameSeq < pruneEvery) {
      return Object.assign({}, previous, { skipped: true, reason: 'throttled', pruneEveryFrames: pruneEvery });
    }

    var keys = Object.keys(cache);
    var cacheKeyCount = keys.length;
    var activeKeyCount = countOwnKeys(activeKeys);
    var configuredLimit = getStaticPacketItemBaseCacheLimit();
    // Never make the current visible active set itself exceed the effective limit.
    // With 80x80 scenes the active visible packet set can be >4096; pruning below
    // that value just scans every active key and removes nothing.
    var effectiveLimit = Math.max(configuredLimit, activeKeyCount + 1024);
    var hardLimit = Math.max(effectiveLimit + 1024, Math.floor(effectiveLimit * 1.25));
    var removed = 0;

    if (cacheKeyCount <= hardLimit) {
      var skippedResult = {
        removed: 0,
        size: cacheKeyCount,
        skipped: true,
        reason: 'within-effective-limit',
        activeKeyCount: activeKeyCount,
        cacheKeyCount: cacheKeyCount,
        limit: configuredLimit,
        effectiveLimit: effectiveLimit,
        hardLimit: hardLimit,
        pruneEveryFrames: pruneEvery
      };
      state.lastStaticPacketItemBasePruneFrameSeq = frameSeq;
      state.lastStaticPacketItemBasePruneResult = skippedResult;
      return skippedResult;
    }

    keys.sort(function (a, b) {
      var av = cache[a] && cache[a].lastUsedSeq || 0;
      var bv = cache[b] && cache[b].lastUsedSeq || 0;
      return av - bv;
    });

    var target = Math.max(effectiveLimit, Math.floor(hardLimit * 0.8));
    var size = cacheKeyCount;
    for (var i = 0; i < keys.length && size > target; i += 1) {
      var key = keys[i];
      if (activeKeys && activeKeys[key]) continue;
      try {
        if (Object.prototype.hasOwnProperty.call(cache, key)) {
          delete cache[key];
          removed += 1;
          size -= 1;
        }
      } catch (_) {}
    }

    var result = {
      removed: removed,
      size: size,
      skipped: false,
      reason: removed > 0 ? 'pruned-lru-inactive' : 'all-old-entries-active-or-protected',
      activeKeyCount: activeKeyCount,
      cacheKeyCount: cacheKeyCount,
      limit: configuredLimit,
      effectiveLimit: effectiveLimit,
      hardLimit: hardLimit,
      pruneEveryFrames: pruneEvery
    };
    state.lastStaticPacketItemBasePruneFrameSeq = frameSeq;
    state.lastStaticPacketItemBasePruneResult = result;
    return result;
  }

  function getStaticPacketItemBaseCached(packet, viewRotation, deps, camera, renderTransform, runStartIndex, packetIndex) {
    var out = {
      ok: false,
      cacheHit: false,
      cacheKey: '',
      projected: null,
      chunkTextureSignature: '',
      drawData: null,
      geometryCacheHit: false,
      drawDataCacheHit: false,
      projectionLookupMs: 0,
      chunkSignatureBuildMs: 0,
      drawDataLookupMs: 0,
      reason: ''
    };
    var cacheKey = buildStaticPacketItemBaseCacheKey(packet, renderTransform, viewRotation, deps);
    out.cacheKey = cacheKey;
    var cache = state.staticPacketItemBaseCache && state.staticPacketItemBaseCache[cacheKey] || null;
    state.staticPacketItemBaseCacheSeq += 1;
    if (cache && cache.projected && cache.drawData && cache.chunkTextureSignature) {
      cache.lastUsedSeq = state.staticPacketItemBaseCacheSeq;
      out.ok = true;
      out.cacheHit = true;
      out.projected = cache.projected;
      out.chunkTextureSignature = cache.chunkTextureSignature;
      out.drawData = cache.drawData;
      out.geometryCacheHit = true;
      out.drawDataCacheHit = true;
      return out;
    }
    var projectionStartedAt = nowMs();
    var projected = getPacketProjectedGeometry(packet, viewRotation, deps);
    out.projectionLookupMs = Math.max(0, nowMs() - projectionStartedAt);
    if (!projected) {
      out.reason = 'projection-failed';
      return out;
    }
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    out.geometryCacheHit = !!(cacheState && cacheState.geometryCacheHit === true);
    var chunkSignatureStartedAt = nowMs();
    var chunkTextureSignature = buildPacketChunkTextureSignature(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps);
    out.chunkSignatureBuildMs = Math.max(0, nowMs() - chunkSignatureStartedAt);
    var drawDataStartedAt = nowMs();
    var drawData = buildPacketChunkCacheDrawCommandsCached(packet, projected, camera, renderTransform, runStartIndex, packetIndex, deps, chunkTextureSignature);
    out.drawDataLookupMs = Math.max(0, nowMs() - drawDataStartedAt);
    out.drawDataCacheHit = !!(packet && packet.__pixiStaticChunkDrawDataCacheHit === true);
    if (!state.staticPacketItemBaseCache) state.staticPacketItemBaseCache = Object.create(null);
    state.staticPacketItemBaseCache[cacheKey] = {
      projected: projected,
      chunkTextureSignature: chunkTextureSignature,
      drawData: drawData,
      lastUsedSeq: state.staticPacketItemBaseCacheSeq,
      packetId: packet && packet.id ? String(packet.id) : ''
    };
    out.ok = true;
    out.projected = projected;
    out.chunkTextureSignature = chunkTextureSignature;
    out.drawData = drawData;
    return out;
  }

  function makeOrderRunPlanCacheKey(items) {
    var list = Array.isArray(items) ? items : [];
    var parts = ['order-run-plan-v=07.18I', 'n=' + String(list.length), 'min=' + String(getOrderRunRenderTextureMinPacketCount())];
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      parts.push(String(getItemOrderIndex(item)) + ':' + String(item && item.chunkTextureSignature || '') + ':' + packetIdForDiagnostics(item && item.packet));
    }
    return parts.join('|');
  }

  function cloneOrderRunPlanForFrame(plan) {
    if (!plan || typeof plan !== 'object') return null;
    // Groups are immutable cached texture plans.  Graphics items are rebound
    // separately on plan-cache hits because they contain per-frame packet refs,
    // projected data, and renderSignature fields.  Reusing old Graphics item
    // objects was the source of the one-face stale GREEN/CYAN mismatch.
    return Object.assign({}, plan, {
      cacheGroups: Array.isArray(plan.cacheGroups) ? plan.cacheGroups : [],
      graphicsItems: Array.isArray(plan.graphicsItems) ? plan.graphicsItems : []
    });
  }

  function makeOrderRunGraphicsItemRebindKey(item) {
    item = item || {};
    var packet = item.packet || null;
    return [
      String(getItemOrderIndex(item)),
      String(item.chunkTextureSignature || ''),
      packetIdForDiagnostics(packet)
    ].join('|');
  }

  function rebindOrderRunGraphicsItemsToCurrentFrame(plan, currentItems) {
    if (!plan || !Array.isArray(plan.graphicsItems) || !plan.graphicsItems.length) {
      return { reboundCount: 0, missingCount: 0, graphicsItemCount: 0 };
    }
    var list = Array.isArray(currentItems) ? currentItems : [];
    var byKey = Object.create(null);
    for (var i = 0; i < list.length; i += 1) {
      var current = list[i];
      var key = makeOrderRunGraphicsItemRebindKey(current);
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(current);
    }
    var rebound = [];
    var reboundCount = 0;
    var missingCount = 0;
    for (var gi = 0; gi < plan.graphicsItems.length; gi += 1) {
      var stale = plan.graphicsItems[gi];
      var staleKey = makeOrderRunGraphicsItemRebindKey(stale);
      var queue = byKey[staleKey] || null;
      var fresh = queue && queue.length ? queue.shift() : null;
      if (fresh) {
        // Make the singleton Graphics item use this frame's packet/projection
        // and force its persistent signature to be recomputed for the current
        // camera / renderTransform.  This is deliberately narrow: cached
        // order-run RenderTexture groups are not rebuilt or disabled.
        try { fresh.renderSignature = ''; } catch (_) {}
        rebound.push(fresh);
        reboundCount += 1;
      } else {
        // Fallback preserves rendering if a future plan shape changes, but the
        // diagnostic makes the miss visible.
        rebound.push(stale);
        missingCount += 1;
      }
    }
    plan.graphicsItems = rebound;
    plan.graphicsItemsReboundToCurrentFrame = true;
    plan.graphicsItemsReboundCount = reboundCount;
    plan.graphicsItemsRebindMissingCount = missingCount;
    return { reboundCount: reboundCount, missingCount: missingCount, graphicsItemCount: rebound.length };
  }

  function applyPersistentGraphicsMetadata(graphics, packet, runStartIndex, packetIndex) {
    try {
      graphics.__pixiStaticWorldPacketId = packet && packet.id || null;
      graphics.__pixiStaticWorldRunStartIndex = runStartIndex;
      graphics.__pixiFramePlanOrderIndex = runStartIndex + packetIndex;
      graphics.zIndex = runStartIndex + packetIndex;
      graphics.visible = true;
    } catch (_) {}
  }

  function rejectFrame(reason, extra) {
    clearActiveRunKeys();
    state.activeCategoryAdopted = false;
    state.totalRejectedFrameCount += 1;
    var container = getPixiContainer();
    clearUnusedGraphics(0);
    setContainerVisible(container, false);
    state.lastSummary = Object.assign({
      ok: false,
      renderer: 'pixi-static-world-packet-consumer',
      activeBackend: getActiveBackend(),
      pixiDrawsStaticWorldPackets: false,
      pixiStaticWorldConsumesFramePlanOrder: false,
      pixiStaticWorldConsumesStaticFacePackets: false,
      pixiStaticWorldUsesSharedProjectedGeometry: false,
      pixiStaticWorldUsesRendererNeutralProjectedGeometry: false,
      pixiStaticWorldUsesPacketMaterialColors: false,
      pixiStaticWorldBypassesCanvas2dBitmapRunCache: true,
      canvas2dStaticBitmapRunCacheUsedForPixi: false,
      canvas2dSkipsStaticWorldPackets: false,
      fallbackReason: reason || 'rejected',
      source: 'rejectFrame'
    }, extra || {});
    emit('summary', state.lastSummary);
    return state.lastSummary;
  }


  function getActiveCameraInteractionType(deps) {
    try {
      if (deps && typeof deps.getActiveCameraInteractionType === 'function') return deps.getActiveCameraInteractionType() || null;
    } catch (_) {}
    try { return global.__habboActiveCameraInteractionType || null; } catch (_) {}
    return null;
  }

  function shouldUseDeferredZoomSettleReuse(deps) {
    try {
      if (deps && typeof deps.shouldUseDeferredZoomSettleReuse === 'function') return deps.shouldUseDeferredZoomSettleReuse() === true;
    } catch (_) {}
    try {
      if (deps && typeof deps.getCameraSettleReuseState === 'function') {
        var settle = deps.getCameraSettleReuseState() || null;
        if (!settle || String(settle.lastEndedType || '') !== 'zoom') return false;
        var now = nowMs();
        return Number(settle.deferCommitUntilMs || 0) > now;
      }
    } catch (_) {}
    return false;
  }

  function getSharedRenderFrameSnapshot() {
    try { return global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ || null; } catch (_) {}
    return null;
  }

  function getSharedFloorSnapshot() {
    var frameSnapshot = getSharedRenderFrameSnapshot();
    if (frameSnapshot && frameSnapshot.floorSnapshot) return frameSnapshot.floorSnapshot;
    try {
      var api = global.__SHARED_FLOOR_LAYER_CACHE_SOURCE_FOR_RENDER__ || null;
      if (api && typeof api.getSnapshot === 'function') return api.getSnapshot() || null;
    } catch (_) {}
    try {
      var opt = global.App && global.App.renderer && global.App.renderer.optimization;
      var api2 = opt && opt.floorLayerCacheSource;
      if (api2 && typeof api2.getSnapshot === 'function') return api2.getSnapshot() || null;
    } catch (_) {}
    return null;
  }


  function getStaticWorldFaceMergeSnapshot() {
    try {
      if (typeof global.getStaticWorldFaceMergeControlStateSnapshotForRender === 'function') {
        return global.getStaticWorldFaceMergeControlStateSnapshotForRender() || null;
      }
    } catch (_) {}
    return null;
  }

  function projectCurrentNoCameraPointToBuiltNoCamera(pointNoCamera, floorSnapshot, deps) {
    var settings = deps && typeof deps.getSettings === 'function' ? deps.getSettings() : (deps && deps.settings ? deps.settings : {});
    var originX = toNumber(settings && settings.originX, toNumber(floorSnapshot && floorSnapshot.floorCacheBlitTransform && floorSnapshot.floorCacheBlitTransform.originX, 0));
    var originY = toNumber(settings && settings.originY, toNumber(floorSnapshot && floorSnapshot.floorCacheBlitTransform && floorSnapshot.floorCacheBlitTransform.originY, 0));
    var currentZoom = toNumber(floorSnapshot && floorSnapshot.currentZoom, 0);
    if (!currentZoom) {
      try { currentZoom = deps && typeof deps.getMainEditorZoomValueForRender === 'function' ? toNumber(deps.getMainEditorZoomValueForRender(), 1) : 1; } catch (_) { currentZoom = 1; }
    }
    var builtZoom = toNumber(floorSnapshot && floorSnapshot.buildZoom, toNumber(floorSnapshot && floorSnapshot.reuseTransform && floorSnapshot.reuseTransform.builtZoom, currentZoom || 1));
    var ratio = currentZoom ? builtZoom / currentZoom : 1;
    return {
      x: originX + (toNumber(pointNoCamera && pointNoCamera.x, 0) - originX) * ratio,
      y: originY + (toNumber(pointNoCamera && pointNoCamera.y, 0) - originY) * ratio,
      currentZoom: currentZoom,
      builtZoom: builtZoom,
      zoomRatio: ratio
    };
  }

  function buildStaticFloorAlignmentProbe(packet, projected, camera, deps, runStartIndex, packetIndex, renderTransform) {
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var pixiTransform = transform && transform.pixi || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var pointNoCamera = null;
    try {
      if (projected && Array.isArray(projected.pointsNoCamera) && projected.pointsNoCamera.length) pointNoCamera = projected.pointsNoCamera[0];
      else if (projected && Array.isArray(projected.loopsNoCamera) && projected.loopsNoCamera.length && projected.loopsNoCamera[0] && projected.loopsNoCamera[0].length) pointNoCamera = projected.loopsNoCamera[0][0];
    } catch (_) { pointNoCamera = null; }
    if (!pointNoCamera) {
      return {
        ok: false,
        reason: 'no-projected-sample-point',
        packetId: packet && packet.id ? String(packet.id) : '',
        runStartIndex: runStartIndex,
        packetIndex: packetIndex,
        effectiveFaceMergeMode: faceMerge && faceMerge.effectiveFaceMergeMode ? String(faceMerge.effectiveFaceMergeMode) : '',
        pendingFaceMergeMode: faceMerge && faceMerge.pendingFaceMergeMode ? String(faceMerge.pendingFaceMergeMode) : ''
      };
    }
    var staticRenderPoint = mapNoCameraPointToFinalScreenPoint(pointNoCamera, camera, renderTransform, deps);
    var staticScreenX = toNumber(staticRenderPoint && staticRenderPoint.x, toNumber(pointNoCamera.x, 0) + toNumber(camera && camera.x, 0));
    var staticScreenY = toNumber(staticRenderPoint && staticRenderPoint.y, toNumber(pointNoCamera.y, 0) + toNumber(camera && camera.y, 0));
    var builtNoCamera = projectCurrentNoCameraPointToBuiltNoCamera(pointNoCamera, floorSnapshot, deps);
    var builtScreenX = toNumber(builtNoCamera.x, 0) + toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0));
    var builtScreenY = toNumber(builtNoCamera.y, 0) + toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0));
    var floorScale = toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1));
    var floorSpriteX = toNumber(pixiTransform && pixiTransform.spriteX, 0);
    var floorSpriteY = toNumber(pixiTransform && pixiTransform.spriteY, 0);
    var floorEquivalentX = floorSpriteX + floorScale * builtScreenX;
    var floorEquivalentY = floorSpriteY + floorScale * builtScreenY;
    var dx = staticScreenX - floorEquivalentX;
    var dy = staticScreenY - floorEquivalentY;
    var absMax = Math.max(Math.abs(dx), Math.abs(dy));
    var alignmentStaticRotationDiagnostics = getStaticRotationDiagnosticsForCache(floorSnapshot && floorSnapshot.viewRotation != null ? floorSnapshot.viewRotation : 0, deps);
    var alignmentStaticRotation = alignmentStaticRotationDiagnostics.staticCacheViewRotation;
    return {
      ok: absMax <= 1.25,
      reason: absMax <= 1.25 ? 'within-tolerance' : 'static-floor-transform-diverged',
      packetId: packet && packet.id ? String(packet.id) : '',
      runStartIndex: runStartIndex,
      packetIndex: packetIndex,
      samplePointSource: projected && Array.isArray(projected.pointsNoCamera) && projected.pointsNoCamera.length ? 'pointsNoCamera[0]' : 'loopsNoCamera[0][0]',
      staticScreenX: Number(staticScreenX.toFixed ? staticScreenX.toFixed(3) : staticScreenX),
      staticScreenY: Number(staticScreenY.toFixed ? staticScreenY.toFixed(3) : staticScreenY),
      floorEquivalentX: Number(floorEquivalentX.toFixed ? floorEquivalentX.toFixed(3) : floorEquivalentX),
      floorEquivalentY: Number(floorEquivalentY.toFixed ? floorEquivalentY.toFixed(3) : floorEquivalentY),
      dx: Number(dx.toFixed ? dx.toFixed(3) : dx),
      dy: Number(dy.toFixed ? dy.toFixed(3) : dy),
      maxAbsError: Number(absMax.toFixed ? absMax.toFixed(3) : absMax),
      currentCameraX: toNumber(camera && camera.x, 0),
      currentCameraY: toNumber(camera && camera.y, 0),
      floorBuildCameraX: toNumber(floorSnapshot && floorSnapshot.buildCameraX, toNumber(reuse && reuse.builtCameraX, 0)),
      floorBuildCameraY: toNumber(floorSnapshot && floorSnapshot.buildCameraY, toNumber(reuse && reuse.builtCameraY, 0)),
      currentZoom: builtNoCamera.currentZoom,
      floorBuildZoom: builtNoCamera.builtZoom,
      floorReuseScale: floorScale,
      floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
      floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0)),
      floorTransformShouldReuse: !!(transform && transform.shouldReuse === true),
      floorTransformScaled: !!(transform && transform.scaled === true),
      staticUsesSharedFloorReuseTransform: !!(renderTransform && renderTransform.active === true),
      staticUsesSharedRenderFrameSnapshot: !!getSharedRenderFrameSnapshot(),
      staticSharedRenderFrameSurfaceRevision: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorSharedSurfaceRevision : null,
      staticSharedRenderFrameTextureVersion: getStaticSharedFrameTextureVersionForCache(alignmentStaticRotation),
      staticSharedRenderFrameTextureVersionRaw: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorTextureVersion : '',
      visualViewRotation: alignmentStaticRotationDiagnostics.visualViewRotation,
      staticCacheViewRotation: alignmentStaticRotationDiagnostics.staticCacheViewRotation,
      staticCacheViewRotationMode: alignmentStaticRotationDiagnostics.staticCacheViewRotationMode,
      staticCacheViewRotationDelta: alignmentStaticRotationDiagnostics.staticCacheViewRotationDelta,
      staticCacheRotationWasFractional: alignmentStaticRotationDiagnostics.staticCacheRotationWasFractional === true,
      fractionalRotationInStaticCacheKey: alignmentStaticRotationDiagnostics.fractionalRotationInStaticCacheKey === true,
      staticSharedFloorReuseReason: renderTransform && renderTransform.reason ? String(renderTransform.reason) : '',
      floorSharedSurfaceRevision: toNumber(floorSnapshot && floorSnapshot.sharedSurfaceRevision, 0),
      effectiveFaceMergeMode: faceMerge && faceMerge.effectiveFaceMergeMode ? String(faceMerge.effectiveFaceMergeMode) : '',
      pendingFaceMergeMode: faceMerge && faceMerge.pendingFaceMergeMode ? String(faceMerge.pendingFaceMergeMode) : '',
      zoomInteractionActive: faceMerge && faceMerge.zoomInteractionActive === true,
      zoomSettlePending: faceMerge && faceMerge.zoomSettlePending === true
    };
  }

  function shouldDelegateStaticToOriginalZoomPath(deps) {
    var interactionType = String(getActiveCameraInteractionType(deps) || '');
    var zoomActive = interactionType === 'zoom' || shouldUseDeferredZoomSettleReuse(deps) === true;
    if (!zoomActive) return { delegate: false, reason: '' };
    var floorSnapshot = getSharedFloorSnapshot();
    var transform = floorSnapshot && floorSnapshot.floorCacheBlitTransform || null;
    var reuse = floorSnapshot && floorSnapshot.reuseTransform || null;
    var scaled = !!(transform && transform.scaled === true) || Math.abs(toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1)) - 1) > 0.001;
    var cameraTransformOnly = !!(reuse && reuse.cameraTransformOnly === true) || !!(transform && transform.shouldReuse === true);
    if (scaled || cameraTransformOnly) {
      return {
        delegate: true,
        reason: 'zoom-reuse-transform-delegated-to-original-static-path',
        zoomInteractionActive: interactionType === 'zoom',
        zoomSettlePending: shouldUseDeferredZoomSettleReuse(deps) === true,
        floorReuseScale: toNumber(transform && transform.scale, toNumber(reuse && reuse.scale, 1)),
        floorReuseDx: toNumber(transform && transform.dx, toNumber(reuse && reuse.dx, 0)),
        floorReuseDy: toNumber(transform && transform.dy, toNumber(reuse && reuse.dy, 0))
      };
    }
    return { delegate: false, reason: '' };
  }


  function makeBeginFramePhaseDiagnostics(order, meta) {
    return {
      step: STEP,
      phase: PHASE,
      source: 'pixi-static-world-packet-consumer.beginFrame',
      framePlanId: String(meta && meta.framePlanId || 'frameplan:none'),
      frameSeq: state.frameSeq,
      renderableCount: Array.isArray(order) ? order.length : 0,
      ok: false,
      lastPhase: 'start',
      reason: '',
      activeBackend: getActiveBackend(),
      staticRunCount: 0,
      staticPacketCount: 0,
      supportedPacketScanCount: 0,
      failedPacketReason: '',
      failedPacketId: null,
      collectStaticRunsMs: 0,
      assetClassificationMs: 0,
      staticPacketCountMs: 0,
      supportedPacketScanMs: 0,
      setupMs: 0,
      chunkInputBeginFrameMs: 0,
      staticPacketItemLoopMs: 0,
      staticPacketItemBuildCount: 0,
      staticPacketItemReuseCount: 0,
      staticChunkItemPlanCacheEnabled: false,
      staticChunkItemPlanCacheHitCount: 0,
      staticChunkItemPlanCacheMissCount: 0,
      staticChunkItemPlanCacheHitRate: 0,
      staticChunkItemPlanCacheHitPacketCount: 0,
      staticChunkItemPlanCacheMissPacketCount: 0,
      staticChunkItemPlanCacheBuiltPacketCount: 0,
      staticChunkItemPlanCacheLookupMs: 0,
      staticChunkItemPlanCacheMaterializeMs: 0,
      staticChunkItemPlanCacheSize: 0,
      staticChunkItemPlanCachePrunedCount: 0,
      staticMaterializedPlanCacheEnabled: false,
      staticMaterializedPlanCacheHit: false,
      staticMaterializedPlanExactCacheHit: false,
      staticStableItemPlanContentSetHit: false,
      staticStableItemPlanContentSetReason: '',
      staticStableItemPlanContentSetKeyHash: '',
      staticMaterializedPlanCacheSize: 0,
      staticMaterializedContentSetCacheSize: 0,
      staticMaterializedPlanCacheReason: '',
      staticMaterializedPlanCacheLookupMs: 0,
      staticStableItemPlanCacheGate: '',
      staticStableItemPlanCacheBlockedBy: '',
      staticStableItemPlanCacheGateMode: '',
      pixiPerformanceModeEnabled: false,
      verboseStaticDiagnosticsEnabled: false,
      chunkInputDiagnosticsSuppressedForStablePlan: false,
      stableItemPlanCacheRequiresPerformanceMode: false,
      staticStableItemPlanFastHitEnabled: false,
      staticStableItemPlanFastHit: false,
      staticStableItemPlanFastHitReason: '',
      staticStableItemPlanFastItemCount: 0,
      staticStableItemPlanFastSplitHit: false,
      stablePlanKeyDiffEnabled: true,
      stablePlanKeyDiffReason: '',
      stablePlanKeyMissComparedTo: '',
      stablePlanKeyDiffFieldCount: 0,
      stablePlanKeyDiffFields: '',
      stablePlanKeyDiffTop: '',
      stablePlanKeyChangedFromPrevious: false,
      stablePlanKeyNearestCacheHit: false,
      stablePlanKeyNearestCacheDiffFieldCount: 0,
      stablePlanKeyNearestCacheDiffTop: '',
      stablePlanKeyCurrentHash: '',
      stablePlanKeyPreviousHash: '',
      stablePlanKeyNearestCacheHash: '',
      stablePlanKeyCurrentContentHash: '',
      stablePlanKeyPreviousContentHash: '',
      stablePlanKeyContentHashChanged: false,
      stablePlanKeyRunsHashChanged: false,
      stablePlanKeyStaticSharedTexVerChanged: false,
      stablePlanKeyFloorBuildCameraChanged: false,
      stablePlanKeyFloorSurfaceRevisionChanged: false,
      stablePlanKeyFaceMergeChanged: false,
      stablePlanKeyCurrentCameraChanged: false,
      projectedGeometryCacheHitCount: 0,
      projectedGeometryCacheMissCount: 0,
      staticPacketProjectionLookupMs: 0,
      staticPacketChunkSignatureBuildMs: 0,
      staticPacketDrawDataLookupMs: 0,
      pruneStaticPacketItemBaseCacheMs: 0,
      chunkEligibilitySplitMs: 0,
      orderRunDiagnosticsBuildMs: 0,
      chunkRenderTextureFrameMs: 0,
      orderRunRenderTextureFrameMs: 0,
      persistentGraphicsMs: 0,
      fallbackPersistentGraphicsMs: 0,
      containerSortMs: 0,
      summaryBuildMs: 0,
      totalBeginFrameMs: 0
    };
  }

  function publishBeginFramePhaseDiagnostics(diag, reason, extra, forceEmit) {
    if (!diag) return null;
    diag.reason = reason || diag.reason || '';
    diag.totalBeginFrameMs = Math.max(0, nowMs() - toNumber(diag.__startAt, nowMs()));
    var out = Object.assign({}, diag, extra || {});
    delete out.__startAt;
    state.lastBeginFramePhaseDiagnostics = out;
    if (forceEmit || out.totalBeginFrameMs >= 16 || out.ok !== true) emit('begin-frame-phase-diagnostics', out);
    return out;
  }

  function getLastBeginFramePhaseDiagnostics() {
    return state.lastBeginFramePhaseDiagnostics || null;
  }

  function getLastBeginFrameExceptionDiagnostics() {
    return state.lastBeginFrameExceptionDiagnostics || null;
  }


  function isStaticMaterializedPlanCacheEnabled() {
    try {
      if (global.localStorage) {
        var stableRaw = global.localStorage.getItem('pixiStaticStableItemPlanCache');
        if (stableRaw === '0' || stableRaw === 'false') return false;
        var legacyRaw = global.localStorage.getItem('pixiStaticMaterializedPlanCache');
        if (legacyRaw === '0' || legacyRaw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function getStaticMaterializedPlanCacheLimit() {
    var raw = null;
    try {
      if (global.localStorage) {
        raw = global.localStorage.getItem('pixiStaticStableItemPlanCacheLimit') || global.localStorage.getItem('pixiStaticMaterializedPlanCacheLimit');
      }
    } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 1) n = 12;
    return Math.max(1, Math.min(64, Math.floor(n)));
  }

  function isStaticStableItemPlanFastHitEnabled() {
    try {
      if (global.localStorage) {
        var raw = global.localStorage.getItem('pixiStaticStableItemPlanFastHit');
        if (raw === '0' || raw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function isStaticChunkItemPlanCacheEnabled() {
    try {
      if (global.localStorage) {
        var raw = global.localStorage.getItem('pixiStaticChunkItemPlanCache');
        if (raw === '0' || raw === 'false') return false;
      }
    } catch (_) {}
    return true;
  }

  function getStaticChunkItemPlanCacheLimit() {
    var raw = null;
    try { if (global.localStorage) raw = global.localStorage.getItem('pixiStaticChunkItemPlanCacheLimit'); } catch (_) {}
    var n = Number(raw);
    if (!Number.isFinite(n) || n < 16) n = 512;
    return Math.max(16, Math.min(4096, Math.floor(n)));
  }

  function getStaticStableItemPlanCacheGate(chunkInputDiagnosticsSuppressed) {
    var explicitCacheEnabled = isStaticMaterializedPlanCacheEnabled();
    var perfModeEnabled = isPixiPerformanceModeEnabled();
    var verboseDiagnosticsEnabled = isVerboseStaticDiagnosticsEnabled();
    var blockedBy = [];
    if (!explicitCacheEnabled) blockedBy.push('explicit-disabled-by-localStorage');
    // PXM-07.18O4: normal debug-log capture must not disable the fast-hit
    // stable item-plan cache. Only the explicit verbose static diagnostics mode
    // keeps the older packet-by-packet path so acceptPacket/alignment probes can
    // inspect every static packet. pixiPerformanceMode is now a log-volume mode,
    // not a performance-feature gate.
    if (verboseDiagnosticsEnabled) blockedBy.push('verbose-static-diagnostics');
    var enabled = explicitCacheEnabled === true && verboseDiagnosticsEnabled !== true;
    return {
      enabled: enabled,
      gate: enabled ? 'enabled' : 'blocked',
      blockedBy: blockedBy.length ? blockedBy.join(',') : '',
      gateMode: 'decoupled-from-pixiPerformanceMode;blocked-only-by-explicit-disable-or-verbose-static-diagnostics',
      pixiPerformanceModeEnabled: perfModeEnabled === true,
      verboseStaticDiagnosticsEnabled: verboseDiagnosticsEnabled === true,
      chunkInputDiagnosticsSuppressed: chunkInputDiagnosticsSuppressed === true,
      requiresPerformanceMode: false
    };
  }

  function hasValidFastStableItemPlanPayload(cached, staticPacketCount) {
    if (!cached || !Array.isArray(cached.fastChunkItems)) return false;
    if (cached.fastChunkItems.length !== Number(staticPacketCount || 0)) return false;
    if (!cached.fastActiveStaticItemBaseCacheKeys) return false;
    if (!cached.fastChunkItems.length) return false;
    return true;
  }

  function cloneFastSplitForStableItemPlan(split) {
    if (!split) return null;
    return {
      chunkItems: Array.isArray(split.chunkItems) ? split.chunkItems : [],
      playerSensitiveItems: Array.isArray(split.playerSensitiveItems) ? split.playerSensitiveItems : [],
      playerSensitivePacketCount: split.playerSensitivePacketCount != null ? toNumber(split.playerSensitivePacketCount, 0) : (Array.isArray(split.playerSensitiveItems) ? split.playerSensitiveItems.length : 0)
    };
  }

  function packetIdentityForMaterializedPlan(packet, runStartIndex, packetIndex) {
    if (!packet) return 'null';
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    return [
      'packet=' + String(packet.id || ''),
      'instance=' + String(packet.instanceId || ''),
      'prefab=' + String(packet.prefabId || ''),
      'chunk=' + String(getPacketChunkKey(packet)),
      'face=' + String(packet.semanticFace || '') + '/' + String(packet.screenFace || ''),
      'faceKey=' + String(packet.faceKey || ''),
      'cell=' + safeRoundForSignature(packet.cellX, 3) + ',' + safeRoundForSignature(packet.cellY, 3) + ',' + safeRoundForSignature(packet.cellZ, 3),
      'sortDepth=' + safeRoundForSignature(packet.sortKey, 3) + ',' + safeRoundForSignature(packet.depthKey, 3),
      'merge=' + String(packet.mergedFace === true) + ',' + String(packet.mergedFaceCount || '') + ',' + String(packet.mergeWidth || '') + ',' + String(packet.mergeHeight || ''),
      'fill=' + String(packet.fill || ''),
      'stroke=' + String(packet.stroke || ''),
      'width=' + String(packet.width || 1),
      'terrainStroke=' + String(packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet.terrainBoundaryStrokeWidth || 0),
      'overlayCount=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : ''),
      'world=' + getPacketWorldFingerprintForCache(packet),
      'stableDemergedFace=' + String(packet.actorInteractionStableDemergedFace === true),
      'stableLocalDemerge=' + String(packet.actorInteractionStableLocalDemerge === true),
      'stableDemergeMode=' + String(packet.actorInteractionStableDemergeMode || ''),
      'groupFootprintMode=' + String(packet.actorInteractionGroupFootprintMode || '')
    ].join(';');
  }

  function buildRunsSentinelSignatureForMaterializedPlan(runs) {
    var list = Array.isArray(runs) ? runs : [];
    var orderedHash = 2166136261;
    var xorA = 0;
    var xorB = 0;
    var sumA = 0;
    var sumB = 0;
    var sumSqA = 0;
    var packetCount = 0;
    var firstIdentity = '';
    var lastIdentity = '';
    for (var r = 0; r < list.length; r += 1) {
      var run = list[r] || {};
      var packets = Array.isArray(run.packets) ? run.packets : [];
      for (var i = 0; i < packets.length; i += 1) {
        var identity = packetIdentityForMaterializedPlan(packets[i]);
        if (!firstIdentity) firstIdentity = identity;
        lastIdentity = identity;
        orderedHash = hashString32(orderedHash, identity);
        var hA = hashString32(2166136261, identity);
        var hB = hashString32(16777619, identity);
        xorA = (xorA ^ hA) >>> 0;
        xorB = (xorB ^ hB) >>> 0;
        sumA = (sumA + hA) >>> 0;
        sumB = (sumB + hB) >>> 0;
        sumSqA = (sumSqA + Math.imul(hA, hA)) >>> 0;
        packetCount += 1;
      }
    }
    var orderedHashText = String((orderedHash >>> 0).toString(36));
    var contentHashText = [
      String(packetCount),
      String((xorA >>> 0).toString(36)),
      String((xorB >>> 0).toString(36)),
      String((sumA >>> 0).toString(36)),
      String((sumB >>> 0).toString(36)),
      String((sumSqA >>> 0).toString(36))
    ].join(',');
    return {
      orderedHash: orderedHashText,
      contentHash: contentHashText,
      packetCount: packetCount,
      firstIdentity: firstIdentity,
      lastIdentity: lastIdentity,
      orderedSignature: [
        'stable-item-plan-content-v=07.18O5',
        'runGroupPolicy=exact-ordered-fast-hit;content-set-fallback-available',
        'packetCount=' + String(packetCount),
        'hash=' + orderedHashText,
        'contentHash=' + contentHashText,
        'first=' + firstIdentity,
        'last=' + lastIdentity
      ].join('|'),
      contentSetSignature: [
        'stable-item-plan-content-set-v=07.18O5',
        'packetCount=' + String(packetCount),
        'contentHash=' + contentHashText
      ].join('|')
    };
  }

  function makeRunsSentinelSignatureForMaterializedPlan(runs) {
    return buildRunsSentinelSignatureForMaterializedPlan(runs).orderedSignature;
  }

  function makeStaticMaterializedPlanCacheKeyDescriptor(runs, staticPacketCount, viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache) {
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var active = !!(renderTransform && renderTransform.active === true);
    var runSig = buildRunsSentinelSignatureForMaterializedPlan(runs);
    var commonKeyParts = [
      'count=' + String(staticPacketCount || 0),
      'view=' + safeRoundForSignature(viewRotation, 3),
      'visualView=' + safeRoundForSignature(visualViewRotation, 3),
      'staticSharedTexVer=' + String(staticSharedRenderFrameTextureVersionForCache || ''),
      'cacheSpace=' + String(active ? 'floor-build-screen' : 'current-screen'),
      'floorBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'floorBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'renderScale=' + safeRoundForSignature(renderTransform && renderTransform.scale, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'faceMerge=' + String(faceMerge && faceMerge.effectiveFaceMergeMode || ''),
      'pendingFaceMerge=' + String(faceMerge && faceMerge.pendingFaceMergeMode || ''),
      getChunkEligibilityPolicySignature()
    ];
    if (!active) commonKeyParts.push('currentCamera=' + safeRoundForSignature(camera && camera.x, 3) + ',' + safeRoundForSignature(camera && camera.y, 3));
    var exactParts = ['static-stable-item-plan-v=07.18O5', runSig.orderedSignature].concat(commonKeyParts);
    var contentSetParts = ['static-stable-item-plan-content-set-cache-v=07.18O5', runSig.contentSetSignature].concat(commonKeyParts);
    var exactKey = exactParts.join('|');
    var contentSetKey = contentSetParts.join('|');
    return {
      exactKey: exactKey,
      contentSetKey: contentSetKey,
      orderedHash: runSig.orderedHash,
      contentHash: runSig.contentHash,
      packetCount: runSig.packetCount,
      contentSetKeyHash: String((hashString32(2166136261, contentSetKey) >>> 0).toString(36))
    };
  }

  function makeStaticMaterializedPlanCacheKey(runs, staticPacketCount, viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache) {
    return makeStaticMaterializedPlanCacheKeyDescriptor(runs, staticPacketCount, viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache).exactKey;
  }

  function parseStaticMaterializedPlanCacheKeyForDiagnostics(key) {
    var parts = String(key || '').split('|');
    var map = Object.create(null);
    var ordered = [];
    for (var i = 0; i < parts.length; i += 1) {
      var part = String(parts[i] || '');
      if (!part) continue;
      var eq = part.indexOf('=');
      var name = eq >= 0 ? part.slice(0, eq) : ('part' + String(i));
      var value = eq >= 0 ? part.slice(eq + 1) : part;
      // Keep the first occurrence stable. The key is intentionally designed
      // with unique part names, but this avoids accidental overwrite if a
      // nested value contains a future delimiter.
      if (map[name] == null) {
        map[name] = value;
        ordered.push(name);
      }
    }
    return { map: map, ordered: ordered, raw: String(key || '') };
  }

  function shortStablePlanKeyValueForDiagnostics(value) {
    value = String(value == null ? '' : value);
    if (value.length <= 96) return value;
    return value.slice(0, 44) + '…' + value.slice(-44);
  }

  function summarizeStablePlanKeyDiffForDiagnostics(previousParts, currentParts, compareLabel) {
    previousParts = previousParts || { map: Object.create(null), ordered: [] };
    currentParts = currentParts || { map: Object.create(null), ordered: [] };
    var seen = Object.create(null);
    var names = [];
    var i;
    for (i = 0; i < previousParts.ordered.length; i += 1) {
      var prevName = previousParts.ordered[i];
      if (seen[prevName]) continue;
      seen[prevName] = true;
      names.push(prevName);
    }
    for (i = 0; i < currentParts.ordered.length; i += 1) {
      var curName = currentParts.ordered[i];
      if (seen[curName]) continue;
      seen[curName] = true;
      names.push(curName);
    }
    var diffs = [];
    for (i = 0; i < names.length; i += 1) {
      var name = names[i];
      var beforeValue = previousParts.map[name];
      var afterValue = currentParts.map[name];
      if (String(beforeValue == null ? '' : beforeValue) !== String(afterValue == null ? '' : afterValue)) {
        diffs.push({
          field: name,
          previous: shortStablePlanKeyValueForDiagnostics(beforeValue),
          current: shortStablePlanKeyValueForDiagnostics(afterValue)
        });
      }
    }
    var diffNames = diffs.map(function (d) { return d.field; });
    function changed(name) { return diffNames.indexOf(name) >= 0; }
    return {
      comparedTo: String(compareLabel || ''),
      diffFieldCount: diffs.length,
      diffFields: diffNames.join(','),
      topDiffs: diffs.slice(0, 8),
      topDiffsText: diffs.slice(0, 5).map(function (d) {
        return d.field + ':' + d.previous + '->' + d.current;
      }).join(' || '),
      currentHash: String(currentParts.map.hash || ''),
      previousHash: String(previousParts.map.hash || ''),
      currentContentHash: String(currentParts.map.contentHash || ''),
      previousContentHash: String(previousParts.map.contentHash || ''),
      contentHashChanged: changed('contentHash'),
      runsHashChanged: changed('hash') || changed('runs') || changed('packetCount') || changed('first') || changed('last'),
      staticSharedTexVerChanged: changed('staticSharedTexVer'),
      floorBuildCameraChanged: changed('floorBuildCamera') || changed('floorBuildZoom') || changed('renderScale') || changed('cacheSpace'),
      floorSurfaceRevisionChanged: changed('floorSurfaceRevision'),
      faceMergeChanged: changed('faceMerge') || changed('pendingFaceMerge'),
      currentCameraChanged: changed('currentCamera'),
      rawChanged: diffs.length > 0
    };
  }

  function findNearestStaticMaterializedPlanCacheKeyForDiagnostics(currentParts, currentKey) {
    var cache = state.staticMaterializedPlanCache || null;
    if (!cache || !currentParts) return null;
    var keys = Object.keys(cache);
    var best = null;
    for (var i = 0; i < keys.length; i += 1) {
      var key = keys[i];
      if (!key || key === currentKey) continue;
      var parts = parseStaticMaterializedPlanCacheKeyForDiagnostics(key);
      var diff = summarizeStablePlanKeyDiffForDiagnostics(parts, currentParts, 'nearest-cache-entry');
      var penalty = diff.diffFieldCount;
      // Prefer entries with the same static order hash; those tell us which
      // non-order key fields are causing miss storms.
      if (String(parts.map.hash || '') === String(currentParts.map.hash || '')) penalty -= 100;
      if (String(parts.map.contentHash || '') === String(currentParts.map.contentHash || '')) penalty -= 60;
      if (String(parts.map.packetCount || '') === String(currentParts.map.packetCount || '')) penalty -= 5;
      if (!best || penalty < best.penalty) best = { key: key, parts: parts, diff: diff, penalty: penalty };
    }
    return best;
  }

  function buildStaticMaterializedPlanKeyDiffDiagnostics(currentKey, cacheHit) {
    var currentParts = parseStaticMaterializedPlanCacheKeyForDiagnostics(currentKey);
    var previousParts = state.lastStaticMaterializedPlanCacheKeyParts || null;
    var previousDiff = previousParts ? summarizeStablePlanKeyDiffForDiagnostics(previousParts, currentParts, 'previous-frame-key') : null;
    var nearest = (!cacheHit && currentKey) ? findNearestStaticMaterializedPlanCacheKeyForDiagnostics(currentParts, currentKey) : null;
    var nearestDiff = nearest && nearest.diff ? nearest.diff : null;
    var out = {
      enabled: true,
      reason: cacheHit ? 'cache-hit' : 'cache-miss-key-diff-diagnostics',
      comparedTo: previousDiff ? previousDiff.comparedTo : 'none',
      diffFieldCount: previousDiff ? previousDiff.diffFieldCount : 0,
      diffFields: previousDiff ? previousDiff.diffFields : '',
      topDiffsText: previousDiff ? previousDiff.topDiffsText : '',
      changedFromPrevious: previousDiff ? previousDiff.rawChanged === true : false,
      currentHash: String(currentParts.map.hash || ''),
      previousHash: previousDiff ? previousDiff.previousHash : '',
      currentContentHash: String(currentParts.map.contentHash || ''),
      previousContentHash: previousDiff ? previousDiff.previousContentHash : '',
      contentHashChanged: previousDiff ? previousDiff.contentHashChanged === true : false,
      runsHashChanged: previousDiff ? previousDiff.runsHashChanged === true : false,
      staticSharedTexVerChanged: previousDiff ? previousDiff.staticSharedTexVerChanged === true : false,
      floorBuildCameraChanged: previousDiff ? previousDiff.floorBuildCameraChanged === true : false,
      floorSurfaceRevisionChanged: previousDiff ? previousDiff.floorSurfaceRevisionChanged === true : false,
      faceMergeChanged: previousDiff ? previousDiff.faceMergeChanged === true : false,
      currentCameraChanged: previousDiff ? previousDiff.currentCameraChanged === true : false,
      nearestCacheHit: nearest != null,
      nearestCacheDiffFieldCount: nearestDiff ? nearestDiff.diffFieldCount : 0,
      nearestCacheDiffFields: nearestDiff ? nearestDiff.diffFields : '',
      nearestCacheDiffTop: nearestDiff ? nearestDiff.topDiffsText : '',
      nearestCacheHash: nearestDiff ? nearestDiff.previousHash : '',
      nearestCacheSameRunsHash: !!(nearest && String(nearest.parts && nearest.parts.map && nearest.parts.map.hash || '') === String(currentParts.map.hash || ''))
    };
    state.lastStaticMaterializedPlanCacheKey = String(currentKey || '');
    state.lastStaticMaterializedPlanCacheKeyParts = currentParts;
    if (cacheHit) {
      state.lastStaticMaterializedPlanCacheHitKey = String(currentKey || '');
      state.lastStaticMaterializedPlanCacheHitParts = currentParts;
    }
    state.lastStaticMaterializedPlanKeyDiffSummary = out;
    return out;
  }

  function getStaticMaterializedPlanCache(key) {
    if (!key || !state.staticMaterializedPlanCache) return null;
    var cached = state.staticMaterializedPlanCache[key] || null;
    if (!cached || !Array.isArray(cached.entries)) return null;
    state.staticMaterializedPlanCacheSeq += 1;
    cached.lastUsedSeq = state.staticMaterializedPlanCacheSeq;
    return cached;
  }

  function buildCurrentStaticItemPlanOrderMetadata(runs, staticPacketCount) {
    var list = Array.isArray(runs) ? runs : [];
    var expectedCount = Number(staticPacketCount || 0);
    var out = [];
    for (var r = 0; r < list.length; r += 1) {
      var run = list[r] || {};
      var packets = Array.isArray(run.packets) ? run.packets : [];
      var runStartIndex = Number(run.runStartIndex || 0);
      for (var i = 0; i < packets.length; i += 1) {
        out.push({
          packet: packets[i],
          runStartIndex: runStartIndex,
          packetIndex: i,
          orderIndex: runStartIndex + i,
          contentIdentity: packetIdentityForMaterializedPlan(packets[i])
        });
      }
    }
    if (out.length !== expectedCount) return null;
    return out;
  }

  function refreshFastStableItemPlanPayloadForCurrentRuns(cached, orderMeta) {
    if (!cached || !Array.isArray(cached.fastChunkItems) || !Array.isArray(orderMeta)) return false;
    if (cached.fastChunkItems.length !== orderMeta.length) return false;
    for (var i = 0; i < cached.fastChunkItems.length; i += 1) {
      var item = cached.fastChunkItems[i];
      var meta = orderMeta[i] || null;
      if (!item || !meta || !meta.packet) return false;
      item.packet = meta.packet;
      item.runStartIndex = meta.runStartIndex;
      item.packetIndex = meta.packetIndex;
      item.orderIndex = meta.orderIndex;
      // This signature can include frame-local metadata in fallback Graphics
      // paths; reset it after refreshing current order metadata so player-
      // sensitive Graphics cannot reuse a stale per-frame signature.
      item.renderSignature = '';
    }
    cached.fastPayloadOrderMetadataRefreshFrameSeq = state.frameSeq;
    cached.fastPayloadOrderMetadataPolicy = 'PXM-07.18O4-refresh-frame-local-order-metadata-after-normalized-content-key-hit';
    return true;
  }

  function materializeStaticItemPlanFromContentSetCache(cached, viewRotation, visualViewRotation, staticPacketCount, runs) {
    var entries = cached && Array.isArray(cached.entries) ? cached.entries : [];
    if (!entries.length || entries.length !== Number(staticPacketCount || 0)) {
      return { ok: false, reason: 'content-set-entry-count-mismatch' };
    }
    var orderMeta = buildCurrentStaticItemPlanOrderMetadata(runs, staticPacketCount);
    if (!orderMeta) return { ok: false, reason: 'content-set-current-order-metadata-mismatch' };
    var cache = state.staticPacketItemBaseCache || null;
    if (!cache) return { ok: false, reason: 'content-set-static-packet-item-base-cache-missing' };

    var baseQueuesByIdentity = Object.create(null);
    for (var e = 0; e < entries.length; e += 1) {
      var entry = entries[e] || {};
      var identity = String(entry.contentIdentity || (entry.packet ? packetIdentityForMaterializedPlan(entry.packet) : ''));
      var baseKey = String(entry.baseCacheKey || '');
      if (!identity || !baseKey) return { ok: false, reason: 'content-set-entry-missing-identity-or-base-key', missingIndex: e };
      if (!baseQueuesByIdentity[identity]) baseQueuesByIdentity[identity] = [];
      baseQueuesByIdentity[identity].push(baseKey);
    }

    var cursorByIdentity = Object.create(null);
    var chunkItems = [];
    var activeKeys = Object.create(null);
    var eligibilityHash = 2166136261;
    for (var i = 0; i < orderMeta.length; i += 1) {
      var meta = orderMeta[i] || {};
      var id = String(meta.contentIdentity || '');
      var queue = baseQueuesByIdentity[id] || null;
      if (!queue || !queue.length) return { ok: false, reason: 'content-set-current-identity-missing-from-cache', missingIdentityIndex: i };
      var cursor = cursorByIdentity[id] || 0;
      if (cursor >= queue.length) return { ok: false, reason: 'content-set-current-identity-occurrence-overflow', missingIdentityIndex: i };
      cursorByIdentity[id] = cursor + 1;
      var baseKeyForCurrent = queue[cursor];
      var base = baseKeyForCurrent && cache[baseKeyForCurrent] || null;
      if (!base || !base.projected || !base.drawData || !base.chunkTextureSignature) {
        return { ok: false, reason: 'content-set-base-cache-entry-missing', missingIndex: i, missingBaseKey: baseKeyForCurrent };
      }
      state.staticPacketItemBaseCacheSeq += 1;
      base.lastUsedSeq = state.staticPacketItemBaseCacheSeq;
      activeKeys[baseKeyForCurrent] = true;
      eligibilityHash = hashPacketEligibilityFields(eligibilityHash, meta.packet, meta.orderIndex);
      chunkItems.push({
        packet: meta.packet,
        projected: base.projected,
        runStartIndex: meta.runStartIndex,
        packetIndex: meta.packetIndex,
        orderIndex: meta.orderIndex,
        renderSignature: '',
        chunkTextureSignature: base.chunkTextureSignature,
        drawData: base.drawData,
        staticCacheViewRotation: viewRotation,
        visualViewRotation: visualViewRotation,
        staticPacketItemBaseCacheHit: true,
        staticPacketItemBaseCacheKey: baseKeyForCurrent,
        staticPlanContentSetFallbackHit: true
      });
    }
    return {
      ok: true,
      fastHit: false,
      contentSetHit: true,
      reason: 'content-set-hit-reused-existing-static-bases-with-current-order-metadata',
      chunkItems: chunkItems,
      activeStaticItemBaseCacheKeys: activeKeys,
      chunkEligibilityItemHash: eligibilityHash,
      fastChunkEligibilitySplit: null,
      refreshedCurrentOrderMetadata: true
    };
  }

  function materializeStaticItemPlanFromExistingBaseCache(cached, viewRotation, visualViewRotation, staticPacketCount, runs) {
    var entries = cached && Array.isArray(cached.entries) ? cached.entries : [];
    if (!entries.length || entries.length !== Number(staticPacketCount || 0)) {
      return { ok: false, reason: 'stable-plan-entry-count-mismatch' };
    }
    var orderMeta = buildCurrentStaticItemPlanOrderMetadata(runs, staticPacketCount);
    if (!orderMeta) return { ok: false, reason: 'stable-plan-current-order-metadata-mismatch' };

    // PXM-07.18O4: normalized content-key fast-hit path. The cache key no
    // longer includes volatile frame-local runStartIndex / packetIndex fields,
    // because O3 logs proved those fields caused hash-only miss storms while
    // static content, camera-space, RenderTexture, and shared texture versions
    // were unchanged. To keep z ordering and player interleaving safe, a hit
    // refreshes packet references and frame-local order metadata from the
    // current runs before reusing the existing staticPacketItemBaseCache-derived
    // projected/drawData payload. No sprite placement, Pixi transform, or
    // RenderTexture object is cached here.
    if (isStaticStableItemPlanFastHitEnabled() && hasValidFastStableItemPlanPayload(cached, staticPacketCount)) {
      if (!refreshFastStableItemPlanPayloadForCurrentRuns(cached, orderMeta)) {
        return { ok: false, reason: 'stable-plan-fast-payload-current-order-refresh-failed' };
      }
      return {
        ok: true,
        fastHit: true,
        reason: 'fast-hit-normalized-content-key-refreshed-current-order-metadata',
        chunkItems: cached.fastChunkItems,
        activeStaticItemBaseCacheKeys: cached.fastActiveStaticItemBaseCacheKeys || Object.create(null),
        chunkEligibilityItemHash: cached.chunkEligibilityItemHash != null ? cached.chunkEligibilityItemHash : 2166136261,
        fastChunkEligibilitySplit: cloneFastSplitForStableItemPlan(cached.fastChunkEligibilitySplit),
        refreshedCurrentOrderMetadata: true
      };
    }

    var chunkItems = [];
    var activeKeys = Object.create(null);
    var cache = state.staticPacketItemBaseCache || null;
    if (!cache) return { ok: false, reason: 'static-packet-item-base-cache-missing' };
    for (var i = 0; i < entries.length; i += 1) {
      var entry = entries[i] || {};
      var meta = orderMeta[i] || {};
      var baseKey = String(entry.baseCacheKey || '');
      var base = baseKey && cache[baseKey] || null;
      if (!base || !base.projected || !base.drawData || !base.chunkTextureSignature) {
        return { ok: false, reason: 'static-packet-item-base-cache-entry-missing', missingIndex: i, missingBaseKey: baseKey };
      }
      state.staticPacketItemBaseCacheSeq += 1;
      base.lastUsedSeq = state.staticPacketItemBaseCacheSeq;
      activeKeys[baseKey] = true;
      chunkItems.push({
        packet: meta.packet || entry.packet,
        projected: base.projected,
        runStartIndex: meta.runStartIndex != null ? meta.runStartIndex : entry.runStartIndex,
        packetIndex: meta.packetIndex != null ? meta.packetIndex : entry.packetIndex,
        orderIndex: meta.orderIndex != null ? meta.orderIndex : entry.orderIndex,
        renderSignature: '',
        chunkTextureSignature: base.chunkTextureSignature,
        drawData: base.drawData,
        staticCacheViewRotation: viewRotation,
        visualViewRotation: visualViewRotation,
        staticPacketItemBaseCacheHit: true,
        staticPacketItemBaseCacheKey: baseKey
      });
    }
    return {
      ok: true,
      fastHit: false,
      reason: 'materialized-from-existing-staticPacketItemBaseCache-with-current-order-metadata',
      chunkItems: chunkItems,
      activeStaticItemBaseCacheKeys: activeKeys,
      chunkEligibilityItemHash: cached.chunkEligibilityItemHash != null ? cached.chunkEligibilityItemHash : 2166136261,
      fastChunkEligibilitySplit: null,
      refreshedCurrentOrderMetadata: true
    };
  }

  function buildChunkItemPlanContextSignature(viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache) {
    var floorSnapshot = renderTransform && renderTransform.floorSnapshot ? renderTransform.floorSnapshot : getSharedFloorSnapshot();
    var faceMerge = getStaticWorldFaceMergeSnapshot();
    var active = !!(renderTransform && renderTransform.active === true);
    var parts = [
      'static-chunk-item-plan-context-v=07.18O6A',
      'view=' + safeRoundForSignature(viewRotation, 3),
      'visualView=' + safeRoundForSignature(visualViewRotation, 3),
      'staticSharedTexVer=' + String(staticSharedRenderFrameTextureVersionForCache || ''),
      'cacheSpace=' + String(active ? 'floor-build-screen' : 'current-screen'),
      'floorBuildCamera=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraX, 3) + ',' + safeRoundForSignature(renderTransform && renderTransform.floorBuildCameraY, 3),
      'floorBuildZoom=' + safeRoundForSignature(renderTransform && renderTransform.floorBuildZoom, 6),
      'renderScale=' + safeRoundForSignature(renderTransform && renderTransform.scale, 6),
      'floorSurfaceRevision=' + String(floorSnapshot && floorSnapshot.sharedSurfaceRevision != null ? floorSnapshot.sharedSurfaceRevision : ''),
      'faceMerge=' + String(faceMerge && faceMerge.effectiveFaceMergeMode || ''),
      'pendingFaceMerge=' + String(faceMerge && faceMerge.pendingFaceMergeMode || ''),
      getChunkEligibilityPolicySignature()
    ];
    if (!active) parts.push('currentCamera=' + safeRoundForSignature(camera && camera.x, 3) + ',' + safeRoundForSignature(camera && camera.y, 3));
    return parts.join('|');
  }

  function buildCurrentChunkItemPlanMetadata(runs, staticPacketCount) {
    var list = Array.isArray(runs) ? runs : [];
    var chunks = Object.create(null);
    var chunkOrder = [];
    var all = [];
    for (var r = 0; r < list.length; r += 1) {
      var run = list[r] || {};
      var packets = Array.isArray(run.packets) ? run.packets : [];
      var runStartIndex = Number(run.runStartIndex || 0);
      for (var i = 0; i < packets.length; i += 1) {
        var packet = packets[i];
        var chunkKey = getPacketChunkKey(packet) || 'chunk:unknown';
        if (!chunks[chunkKey]) {
          chunks[chunkKey] = [];
          chunkOrder.push(chunkKey);
        }
        var meta = {
          packet: packet,
          chunkKey: chunkKey,
          runStartIndex: runStartIndex,
          packetIndex: i,
          orderIndex: runStartIndex + i,
          contentIdentity: packetIdentityForMaterializedPlan(packet)
        };
        chunks[chunkKey].push(meta);
        all.push(meta);
      }
    }
    if (all.length !== Number(staticPacketCount || 0)) return null;
    return { chunks: chunks, chunkOrder: chunkOrder, all: all };
  }

  function makeStaticChunkItemPlanCacheKey(chunkKey, metas, contextSignature) {
    var list = Array.isArray(metas) ? metas : [];
    var h = 2166136261;
    var first = '';
    var last = '';
    for (var i = 0; i < list.length; i += 1) {
      var id = String(list[i] && list[i].contentIdentity || '');
      if (!first) first = id;
      last = id;
      h = hashString32(h, id);
    }
    return [
      'static-chunk-item-plan-v=07.18O6A',
      String(contextSignature || ''),
      'chunk=' + String(chunkKey || ''),
      'n=' + String(list.length),
      'hash=' + String((h >>> 0).toString(36)),
      'first=' + first,
      'last=' + last
    ].join('|');
  }

  function pruneStaticChunkItemPlanCache(activeKeys) {
    var cache = state.staticChunkItemPlanCache || null;
    if (!cache) return { removed: 0, size: 0 };
    var keys = Object.keys(cache);
    var limit = getStaticChunkItemPlanCacheLimit();
    if (keys.length <= limit) return { removed: 0, size: keys.length };
    var active = activeKeys || Object.create(null);
    keys.sort(function (a, b) {
      var av = cache[a] && cache[a].lastUsedSeq || 0;
      var bv = cache[b] && cache[b].lastUsedSeq || 0;
      return av - bv;
    });
    var removed = 0;
    var target = Math.max(16, Math.floor(limit * 0.8));
    for (var i = 0; i < keys.length && Object.keys(cache).length > target; i += 1) {
      var key = keys[i];
      if (active[key]) continue;
      try { delete cache[key]; removed += 1; } catch (_) {}
    }
    return { removed: removed, size: Object.keys(cache).length };
  }

  function materializeChunkItemsFromStaticChunkPlanCache(cacheKey, metas, viewRotation, visualViewRotation) {
    var cache = state.staticChunkItemPlanCache || null;
    var cached = cache && cacheKey ? cache[cacheKey] : null;
    if (!cached || !Array.isArray(cached.entries)) return null;
    var entries = cached.entries;
    var list = Array.isArray(metas) ? metas : [];
    if (entries.length !== list.length) return null;
    var baseCache = state.staticPacketItemBaseCache || null;
    if (!baseCache) return null;
    var chunkItems = [];
    var activeKeys = Object.create(null);
    for (var i = 0; i < list.length; i += 1) {
      var meta = list[i] || {};
      var entry = entries[i] || {};
      if (String(entry.contentIdentity || '') !== String(meta.contentIdentity || '')) return null;
      var baseKey = String(entry.baseCacheKey || '');
      var base = baseKey && baseCache[baseKey] || null;
      if (!base || !base.projected || !base.drawData || !base.chunkTextureSignature) return null;
      state.staticPacketItemBaseCacheSeq += 1;
      base.lastUsedSeq = state.staticPacketItemBaseCacheSeq;
      activeKeys[baseKey] = true;
      chunkItems.push({
        packet: meta.packet,
        projected: base.projected,
        runStartIndex: meta.runStartIndex,
        packetIndex: meta.packetIndex,
        orderIndex: meta.orderIndex,
        renderSignature: '',
        chunkTextureSignature: base.chunkTextureSignature,
        drawData: base.drawData,
        staticCacheViewRotation: viewRotation,
        visualViewRotation: visualViewRotation,
        staticPacketItemBaseCacheHit: true,
        staticPacketItemBaseCacheKey: baseKey,
        staticChunkItemPlanCacheHit: true
      });
    }
    state.staticChunkItemPlanCacheSeq += 1;
    cached.lastUsedSeq = state.staticChunkItemPlanCacheSeq;
    return { chunkItems: chunkItems, activeStaticItemBaseCacheKeys: activeKeys };
  }

  function putStaticChunkItemPlanCache(cacheKey, chunkKey, metas, entries) {
    if (!cacheKey || !Array.isArray(metas) || !Array.isArray(entries) || metas.length !== entries.length) return false;
    if (!state.staticChunkItemPlanCache) state.staticChunkItemPlanCache = Object.create(null);
    state.staticChunkItemPlanCacheSeq += 1;
    state.staticChunkItemPlanCache[cacheKey] = {
      chunkKey: String(chunkKey || ''),
      entries: entries,
      packetCount: entries.length,
      lastUsedSeq: state.staticChunkItemPlanCacheSeq,
      createdFrameSeq: state.frameSeq,
      cachePolicy: 'PXM-07.18O6A-chunk-level-stable-item-plan-reuses-staticPacketItemBaseCache'
    };
    return true;
  }

  function materializeStaticItemsWithChunkLevelPlanCache(runs, staticPacketCount, viewRotation, visualViewRotation, deps, camera, renderTransform, contextSignature, chunkCacheEnabled, phaseDiag) {
    var startedAt = nowMs();
    var meta = buildCurrentChunkItemPlanMetadata(runs, staticPacketCount);
    var out = {
      ok: false,
      reason: '',
      chunkItems: [],
      activeStaticItemBaseCacheKeys: Object.create(null),
      chunkEligibilityItemHash: 2166136261,
      staticMaterializedPlanEntries: [],
      failedPacket: null,
      chunkPlanEnabled: chunkCacheEnabled === true,
      chunkPlanHitCount: 0,
      chunkPlanMissCount: 0,
      chunkPlanHitPacketCount: 0,
      chunkPlanMissPacketCount: 0,
      chunkPlanBuiltPacketCount: 0,
      chunkPlanCacheSize: state.staticChunkItemPlanCache ? objectKeyCountForensics(state.staticChunkItemPlanCache) : 0,
      chunkPlanPrunedCount: 0,
      chunkPlanLookupMs: 0,
      projectionLookupMs: 0,
      packetChunkSignatureBuildMs: 0,
      drawDataLookupMs: 0,
      packetChunkSignatureBuildCount: 0,
      staticPacketItemBuildCount: 0,
      staticPacketItemReuseCount: 0,
      projectedGeometryHitCount: 0,
      projectedGeometryMissCount: 0,
      chunkDrawDataCacheHitCount: 0,
      chunkDrawDataCacheMissCount: 0
    };
    if (!meta) {
      out.reason = 'chunk-plan-current-metadata-mismatch';
      return out;
    }
    var activeChunkPlanKeys = Object.create(null);
    var chunkOrder = meta.chunkOrder || [];
    for (var ci = 0; ci < chunkOrder.length; ci += 1) {
      var chunkKey = chunkOrder[ci];
      var metas = meta.chunks[chunkKey] || [];
      var cacheKey = chunkCacheEnabled ? makeStaticChunkItemPlanCacheKey(chunkKey, metas, contextSignature) : '';
      if (cacheKey) activeChunkPlanKeys[cacheKey] = true;
      var cachedResult = null;
      if (cacheKey) {
        var lookupStartedAt = nowMs();
        cachedResult = materializeChunkItemsFromStaticChunkPlanCache(cacheKey, metas, viewRotation, visualViewRotation);
        out.chunkPlanLookupMs += Math.max(0, nowMs() - lookupStartedAt);
      }
      if (cachedResult && Array.isArray(cachedResult.chunkItems)) {
        out.chunkPlanHitCount += 1;
        out.chunkPlanHitPacketCount += metas.length;
        for (var hk in cachedResult.activeStaticItemBaseCacheKeys) {
          if (Object.prototype.hasOwnProperty.call(cachedResult.activeStaticItemBaseCacheKeys, hk)) out.activeStaticItemBaseCacheKeys[hk] = true;
        }
        for (var hi = 0; hi < cachedResult.chunkItems.length; hi += 1) {
          var hitItem = cachedResult.chunkItems[hi];
          out.chunkItems.push(hitItem);
          out.chunkEligibilityItemHash = hashPacketEligibilityFields(out.chunkEligibilityItemHash, hitItem.packet, hitItem.orderIndex);
          if (hitItem && hitItem.staticPacketItemBaseCacheKey) {
            out.staticMaterializedPlanEntries.push({
              packet: hitItem.packet,
              baseCacheKey: hitItem.staticPacketItemBaseCacheKey,
              runStartIndex: hitItem.runStartIndex,
              packetIndex: hitItem.packetIndex,
              orderIndex: hitItem.orderIndex,
              contentIdentity: packetIdentityForMaterializedPlan(hitItem.packet)
            });
          }
        }
        out.staticPacketItemReuseCount += metas.length;
        out.projectedGeometryHitCount += metas.length;
        out.chunkDrawDataCacheHitCount += metas.length;
        continue;
      }
      out.chunkPlanMissCount += 1;
      out.chunkPlanMissPacketCount += metas.length;
      var entries = [];
      for (var mi = 0; mi < metas.length; mi += 1) {
        var m = metas[mi];
        var packet = m.packet;
        var base = getStaticPacketItemBaseCached(packet, viewRotation, deps, camera, renderTransform, m.runStartIndex, m.packetIndex);
        if (base && base.cacheKey) out.activeStaticItemBaseCacheKeys[base.cacheKey] = true;
        if (!base || base.ok !== true || !base.projected) {
          out.failedPacket = { reason: base && base.reason ? base.reason : 'static-packet-item-base-build-failed', packetId: packet && packet.id || null, runStartIndex: m.runStartIndex };
          out.reason = out.failedPacket.reason;
          return out;
        }
        if (base.cacheHit === true) {
          out.staticPacketItemReuseCount += 1;
          out.projectedGeometryHitCount += 1;
          out.chunkDrawDataCacheHitCount += 1;
        } else {
          out.staticPacketItemBuildCount += 1;
          out.chunkPlanBuiltPacketCount += 1;
          out.projectionLookupMs += toNumber(base.projectionLookupMs, 0);
          out.packetChunkSignatureBuildMs += toNumber(base.chunkSignatureBuildMs, 0);
          out.packetChunkSignatureBuildCount += 1;
          out.drawDataLookupMs += toNumber(base.drawDataLookupMs, 0);
          if (base.geometryCacheHit === true) out.projectedGeometryHitCount += 1;
          else out.projectedGeometryMissCount += 1;
          if (base.drawDataCacheHit === true) out.chunkDrawDataCacheHitCount += 1;
          else out.chunkDrawDataCacheMissCount += 1;
        }
        out.chunkEligibilityItemHash = hashPacketEligibilityFields(out.chunkEligibilityItemHash, packet, m.orderIndex);
        out.chunkItems.push({
          packet: packet,
          projected: base.projected,
          runStartIndex: m.runStartIndex,
          packetIndex: m.packetIndex,
          orderIndex: m.orderIndex,
          renderSignature: '',
          chunkTextureSignature: base.chunkTextureSignature,
          drawData: base.drawData,
          staticCacheViewRotation: viewRotation,
          visualViewRotation: visualViewRotation,
          staticPacketItemBaseCacheHit: base.cacheHit === true,
          staticPacketItemBaseCacheKey: base.cacheKey,
          staticChunkItemPlanCacheHit: false
        });
        if (base.cacheKey) {
          entries.push({ baseCacheKey: base.cacheKey, contentIdentity: m.contentIdentity });
          out.staticMaterializedPlanEntries.push({
            packet: packet,
            baseCacheKey: base.cacheKey,
            runStartIndex: m.runStartIndex,
            packetIndex: m.packetIndex,
            orderIndex: m.orderIndex,
            contentIdentity: m.contentIdentity
          });
        }
      }
      if (chunkCacheEnabled && cacheKey && entries.length === metas.length) putStaticChunkItemPlanCache(cacheKey, chunkKey, metas, entries);
    }
    var prune = chunkCacheEnabled ? pruneStaticChunkItemPlanCache(activeChunkPlanKeys) : { removed: 0, size: state.staticChunkItemPlanCache ? objectKeyCountForensics(state.staticChunkItemPlanCache) : 0 };
    out.chunkPlanPrunedCount = prune.removed;
    out.chunkPlanCacheSize = prune.size;
    try { out.chunkItems.sort(function (a, b) { return getItemOrderIndex(a) - getItemOrderIndex(b); }); } catch (_) {}
    try { out.staticMaterializedPlanEntries.sort(function (a, b) { return toNumber(a && a.orderIndex, 0) - toNumber(b && b.orderIndex, 0); }); } catch (_) {}
    out.chunkEligibilityItemHash = 2166136261;
    for (var sortedHashIndex = 0; sortedHashIndex < out.chunkItems.length; sortedHashIndex += 1) {
      var sortedHashItem = out.chunkItems[sortedHashIndex];
      out.chunkEligibilityItemHash = hashPacketEligibilityFields(out.chunkEligibilityItemHash, sortedHashItem && sortedHashItem.packet, getItemOrderIndex(sortedHashItem));
    }
    out.totalMs = Math.max(0, nowMs() - startedAt);
    out.ok = out.chunkItems.length === Number(staticPacketCount || 0);
    out.reason = out.ok ? 'chunk-level-plan-cache-materialized-current-frame' : 'chunk-level-plan-cache-item-count-mismatch';
    return out;
  }

  function putStaticMaterializedPlanCache(key, payload) {
    if (!key || !payload || !Array.isArray(payload.entries)) return;
    if (!state.staticMaterializedPlanCache) state.staticMaterializedPlanCache = Object.create(null);
    state.staticMaterializedPlanCacheSeq += 1;
    state.staticMaterializedPlanCache[key] = Object.assign({}, payload, {
      lastUsedSeq: state.staticMaterializedPlanCacheSeq,
      createdFrameSeq: state.frameSeq,
      cachePolicy: 'stable-item-plan-fast-hit-reuse-existing-staticPacketItemBaseCache'
    });
    pruneStaticMaterializedPlanCache(key);
    if (payload.contentSetKey) putStaticMaterializedContentSetCache(payload.contentSetKey, payload);
  }

  function putStaticMaterializedContentSetCache(key, payload) {
    if (!key || !payload || !Array.isArray(payload.entries)) return;
    if (!state.staticMaterializedContentSetCache) state.staticMaterializedContentSetCache = Object.create(null);
    state.staticMaterializedContentSetCacheSeq += 1;
    state.staticMaterializedContentSetCache[key] = Object.assign({}, payload, {
      lastUsedSeq: state.staticMaterializedContentSetCacheSeq,
      createdFrameSeq: state.frameSeq,
      cachePolicy: 'content-set-stable-item-plan-fallback-reuse-existing-staticPacketItemBaseCache'
    });
    pruneStaticMaterializedContentSetCache(key);
  }

  function getStaticMaterializedContentSetCache(key) {
    if (!key || !state.staticMaterializedContentSetCache) return null;
    var cached = state.staticMaterializedContentSetCache[key] || null;
    if (!cached || !Array.isArray(cached.entries)) return null;
    state.staticMaterializedContentSetCacheSeq += 1;
    cached.lastUsedSeq = state.staticMaterializedContentSetCacheSeq;
    return cached;
  }

  function pruneStaticMaterializedContentSetCache(activeKey) {
    var cache = state.staticMaterializedContentSetCache || null;
    if (!cache) return { removed: 0, size: 0 };
    var keys = Object.keys(cache);
    var limit = Math.max(4, Math.min(getStaticMaterializedPlanCacheLimit(), 24));
    if (keys.length <= limit) return { removed: 0, size: keys.length };
    keys.sort(function (a, b) {
      var av = cache[a] && cache[a].lastUsedSeq || 0;
      var bv = cache[b] && cache[b].lastUsedSeq || 0;
      return av - bv;
    });
    var removed = 0;
    for (var i = 0; i < keys.length && keys.length - removed > limit; i += 1) {
      var key = keys[i];
      if (key === activeKey) continue;
      try { delete cache[key]; removed += 1; } catch (_) {}
    }
    return { removed: removed, size: Math.max(0, keys.length - removed) };
  }

  function updateStaticMaterializedPlanCacheFastPayload(key, chunkItems, activeKeys, split) {
    if (!key || !state.staticMaterializedPlanCache) return false;
    var cached = state.staticMaterializedPlanCache[key] || null;
    if (!cached || !Array.isArray(cached.entries)) return false;
    if (!Array.isArray(chunkItems) || chunkItems.length !== cached.entries.length) return false;
    cached.fastChunkItems = chunkItems;
    cached.fastActiveStaticItemBaseCacheKeys = activeKeys || Object.create(null);
    cached.fastChunkEligibilitySplit = cloneFastSplitForStableItemPlan(split);
    cached.fastPayloadCreatedFrameSeq = state.frameSeq;
    cached.fastPayloadPolicy = 'reuse-existing-staticPacketItemBaseCache-derived-item-array-and-split';
    return true;
  }

  function pruneStaticMaterializedPlanCache(activeKey) {
    var cache = state.staticMaterializedPlanCache || null;
    if (!cache) return { removed: 0, size: 0 };
    var keys = Object.keys(cache);
    var limit = getStaticMaterializedPlanCacheLimit();
    if (keys.length <= limit) return { removed: 0, size: keys.length };
    keys.sort(function (a, b) {
      var av = cache[a] && cache[a].lastUsedSeq || 0;
      var bv = cache[b] && cache[b].lastUsedSeq || 0;
      return av - bv;
    });
    var removed = 0;
    for (var i = 0; i < keys.length && keys.length - removed > limit; i += 1) {
      var key = keys[i];
      if (key === activeKey) continue;
      try { delete cache[key]; removed += 1; } catch (_) {}
    }
    return { removed: removed, size: Math.max(0, keys.length - removed) };
  }

  function beginFrame(order, meta, deps) {
    var startAt = nowMs();
    state.frameSeq += 1;
    var phaseDiag = makeBeginFramePhaseDiagnostics(order, meta);
    phaseDiag.__startAt = startAt;
    state.lastBeginFramePhaseDiagnostics = phaseDiag;
    clearActiveRunKeys();
    state.activeFramePlanId = String(meta && meta.framePlanId || 'frameplan:none');
    state.activeCategoryAdopted = false;
    phaseDiag.frameSeq = state.frameSeq;
    phaseDiag.framePlanId = state.activeFramePlanId;

    if (getActiveBackend() !== 'pixi') { publishBeginFramePhaseDiagnostics(phaseDiag, 'active-backend-not-pixi', { lastPhase: 'preflight' }, true); return rejectFrame('active-backend-not-pixi', { source: 'beginFrame' }); }
    var Pixi = getPixi();
    if (!Pixi) { publishBeginFramePhaseDiagnostics(phaseDiag, 'pixi-global-missing', { lastPhase: 'preflight' }, true); return rejectFrame('pixi-global-missing', { source: 'beginFrame' }); }
    var container = getPixiContainer();
    if (!container) { publishBeginFramePhaseDiagnostics(phaseDiag, 'pixi-static-world-container-missing', { lastPhase: 'preflight' }, true); return rejectFrame('pixi-static-world-container-missing', { source: 'beginFrame' }); }
    var projectedApi = getProjectedGeometryApi();
    if (!projectedApi || typeof projectedApi.getStaticWorldPacketProjectedGeometry !== 'function') { publishBeginFramePhaseDiagnostics(phaseDiag, 'shared-projected-geometry-api-missing', { lastPhase: 'preflight' }, true); return rejectFrame('shared-projected-geometry-api-missing', { source: 'beginFrame' }); }
    var preflightDoneAt = nowMs();
    phaseDiag.setupMs = Math.max(0, preflightDoneAt - startAt);

    var collectStaticRunsStartedAt = nowMs();
    var runs = collectStaticRuns(order);
    phaseDiag.collectStaticRunsMs = Math.max(0, nowMs() - collectStaticRunsStartedAt);
    phaseDiag.staticRunCount = runs.length;
    phaseDiag.lastPhase = 'collect-static-runs';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);

    var assetClassificationStartedAt = nowMs();
    var assetClassificationSummary = buildAssetRenderableClassificationDiagnostics(order, runs);
    phaseDiag.assetClassificationMs = Math.max(0, nowMs() - assetClassificationStartedAt);
    phaseDiag.lastPhase = 'asset-classification';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
    emitAssetRenderableClassificationDiagnostics(assetClassificationSummary);
    var staticPacketCountStartedAt = nowMs();
    var staticPacketCount = 0;
    for (var ri = 0; ri < runs.length; ri += 1) staticPacketCount += runs[ri].packets.length;
    phaseDiag.staticPacketCountMs = Math.max(0, nowMs() - staticPacketCountStartedAt);
    phaseDiag.staticPacketCount = staticPacketCount;
    if (!staticPacketCount) { publishBeginFramePhaseDiagnostics(phaseDiag, 'no-static-world-face-packets', { lastPhase: 'static-packet-count', runCount: runs.length, staticPacketCount: 0 }, true); return rejectFrame('no-static-world-face-packets', { source: 'beginFrame', runCount: runs.length, staticPacketCount: 0 }); }

    var supportedScanStartedAt = nowMs();
    for (var r = 0; r < runs.length; r += 1) {
      for (var p = 0; p < runs[r].packets.length; p += 1) {
        phaseDiag.supportedPacketScanCount += 1;
        if (!isSupportedPacket(runs[r].packets[p])) {
          publishBeginFramePhaseDiagnostics(phaseDiag, 'unsupported-static-world-packet', {
            lastPhase: 'supported-packet-scan',
            supportedPacketScanMs: Math.max(0, nowMs() - supportedScanStartedAt),
            runStartIndex: runs[r].runStartIndex,
            packetId: runs[r].packets[p] && runs[r].packets[p].id || null
          }, true);
          return rejectFrame('unsupported-static-world-packet', {
            source: 'beginFrame',
            runStartIndex: runs[r].runStartIndex,
            packetId: runs[r].packets[p] && runs[r].packets[p].id || null
          });
        }
      }
    }
    phaseDiag.supportedPacketScanMs = Math.max(0, nowMs() - supportedScanStartedAt);
    phaseDiag.lastPhase = 'supported-packet-scan';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);

    setContainerVisible(container, true);
    try { container.sortableChildren = true; } catch (_) {}
    var zoomDelegate = shouldDelegateStaticToOriginalZoomPath(deps);
    var renderTransform = buildSharedFloorReuseRenderTransform(deps);
    var camera = getCamera(deps);
    var visualViewRotation = normalizeViewRotation(meta);
    var staticRotationDiagnostics = getStaticRotationDiagnosticsForCache(visualViewRotation, deps);
    var viewRotation = staticRotationDiagnostics.staticCacheViewRotation;
    var staticSharedRenderFrameTextureVersionForCache = getStaticSharedFrameTextureVersionForCache(viewRotation);
    var chunkInputApi = getStaticGpuChunkCacheInputApi();
    var chunkInputSummary = null;
    var chunkInputDiagnosticsSuppressed = false;
    var chunkInputBeginStartedAt = nowMs();
    if (chunkInputApi && typeof chunkInputApi.beginFrame === 'function') {
      if (isPixiPerformanceModeEnabled() && !isVerboseStaticDiagnosticsEnabled()) {
        chunkInputDiagnosticsSuppressed = true;
      } else {
        try {
          var staticChunkInputMeta = Object.assign({}, meta || {}, {
            currentViewRotation: viewRotation,
            visualViewRotation: visualViewRotation,
            staticCacheViewRotation: viewRotation,
            staticPacketViewRotation: viewRotation,
            staticSharedRenderFrameTextureVersion: staticSharedRenderFrameTextureVersionForCache,
            fractionalRotationInStaticCacheKey: staticRotationDiagnostics.fractionalRotationInStaticCacheKey === true
          });
          chunkInputApi.beginFrame(staticChunkInputMeta, deps, {
            framePlanId: state.activeFramePlanId,
            staticPacketCount: staticPacketCount,
            runCount: runs.length,
            renderTransformActive: !!(renderTransform && renderTransform.active === true),
            persistentGraphicsReuseEnabled: true
          });
        } catch (_) {}
      }
    }
    phaseDiag.chunkInputBeginFrameMs = Math.max(0, nowMs() - chunkInputBeginStartedAt);
    phaseDiag.lastPhase = 'chunk-input-begin-frame';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
    var graphicsIndex = 0;
    var projectedGeometryHitCount = 0;
    var projectedGeometryMissCount = 0;
    var packetDrawCount = 0;
    var polygonDrawCount = 0;
    var overlayDrawCount = 0;
    var terrainBoundaryDrawCount = 0;
    var persistentGraphicsReuseCount = 0;
    var persistentGraphicsRebuildCount = 0;
    var failedPacket = null;
    var alignmentProbe = null;
    var chunkItems = [];
    var chunkDrawDataCacheHitCount = 0;
    var chunkDrawDataCacheMissCount = 0;
    var chunkRenderTextureSummary = null;
    var orderRunCacheDiagnosticsSummary = null;
    var orderRunRenderTextureSummary = null;
    var optimizationPlacementAuditSummary = null;
    var safeInputPlanAuditSummary = null;
    var orderRunCachedPacketCount = 0;
    var playerSensitiveGraphicsItems = [];
    var orderRunActiveEnabled = false;
    var orderRunActiveReason = 'not-evaluated';
    var evidenceStaticItemBuildStartedAt = nowMs();
    var evidenceProjectionLookupMs = 0;
    var evidencePacketSignatureBuildMs = 0;
    var evidencePacketChunkSignatureBuildMs = 0;
    var evidenceDrawDataLookupMs = 0;
    var evidencePacketSignatureBuildCount = 0;
    var evidencePacketChunkSignatureBuildCount = 0;
    var evidenceStaticPacketItemBuildCount = 0;
    var evidenceChunkEligibilitySplitMs = 0;
    var evidenceOrderRunDiagnosticsBuildMs = 0;
    var evidencePlayerSensitiveDrawMs = 0;
    var evidenceContainerSortMs = 0;
    var evidenceChunkEligibilitySplitCacheHit = false;
    var evidenceChunkEligibilitySplitBuildCount = 0;
    var evidenceChunkEligibilitySplitReuseCount = 0;
    var evidenceChunkEligibilitySplitCacheHitRate = 0;
    var evidenceChunkEligibilitySplitRebuildReason = '';
    var evidenceChunkEligibilitySplitMaterializeMs = 0;
    var evidenceChunkEligibilitySplitComputeMs = 0;
    var evidenceChunkEligibilitySplitCacheSize = 0;
    var evidenceChunkEligibilitySplitCachePrunedCount = 0;

    var evidenceStaticPacketItemReuseCount = 0;
    var evidenceStaticPacketItemCacheHitRate = 0;
    var evidenceStaticPacketItemCachePrunedCount = 0;
    var evidenceStaticPacketItemCacheSize = 0;
    var activeStaticItemBaseCacheKeys = Object.create(null);
    var chunkEligibilityItemHash = 2166136261;
    var materializedPlanCacheKey = '';
    var materializedPlanContentSetKey = '';
    var materializedPlanKeyDescriptor = null;
    var materializedPlanCache = null;
    var materializedPlanCacheRaw = null;
    var materializedPlanContentSetRaw = null;
    var materializedPlanExactCacheHit = false;
    var stableItemPlanContentSetHit = false;
    var stableItemPlanContentSetReason = '';
    var materializedPlanCacheMaterializeResult = null;
    var stableItemPlanFastHitEnabled = isStaticStableItemPlanFastHitEnabled();
    var stableItemPlanFastHit = false;
    var stableItemPlanFastHitReason = '';
    var stableItemPlanFastSplit = null;
    var chunkLevelPlanCacheEnabled = isStaticChunkItemPlanCacheEnabled();
    var chunkLevelPlanResult = null;
    var chunkLevelPlanCacheHitCount = 0;
    var chunkLevelPlanCacheMissCount = 0;
    var chunkLevelPlanCacheHitPacketCount = 0;
    var chunkLevelPlanCacheMissPacketCount = 0;
    var chunkLevelPlanCacheBuiltPacketCount = 0;
    var chunkLevelPlanCacheHitRate = 0;
    var chunkLevelPlanCacheLookupMs = 0;
    var chunkLevelPlanCacheSize = 0;
    var chunkLevelPlanCachePrunedCount = 0;
    var materializedPlanCacheLookupStartedAt = nowMs();
    var stableItemPlanCacheGate = getStaticStableItemPlanCacheGate(chunkInputDiagnosticsSuppressed);
    var materializedPlanCacheEnabled = stableItemPlanCacheGate.enabled === true;
    if (materializedPlanCacheEnabled) {
      materializedPlanKeyDescriptor = makeStaticMaterializedPlanCacheKeyDescriptor(runs, staticPacketCount, viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache);
      materializedPlanCacheKey = materializedPlanKeyDescriptor.exactKey || '';
      materializedPlanContentSetKey = materializedPlanKeyDescriptor.contentSetKey || '';
      materializedPlanCacheRaw = getStaticMaterializedPlanCache(materializedPlanCacheKey);
      if (materializedPlanCacheRaw) {
        materializedPlanExactCacheHit = true;
        materializedPlanCacheMaterializeResult = materializeStaticItemPlanFromExistingBaseCache(materializedPlanCacheRaw, viewRotation, visualViewRotation, staticPacketCount, runs);
        if (materializedPlanCacheMaterializeResult && materializedPlanCacheMaterializeResult.ok === true) materializedPlanCache = materializedPlanCacheMaterializeResult;
      }
      if (!materializedPlanCache && !materializedPlanCacheRaw && materializedPlanContentSetKey) {
        materializedPlanContentSetRaw = getStaticMaterializedContentSetCache(materializedPlanContentSetKey);
        if (materializedPlanContentSetRaw) {
          materializedPlanCacheMaterializeResult = materializeStaticItemPlanFromContentSetCache(materializedPlanContentSetRaw, viewRotation, visualViewRotation, staticPacketCount, runs);
          if (materializedPlanCacheMaterializeResult && materializedPlanCacheMaterializeResult.ok === true) {
            materializedPlanCache = materializedPlanCacheMaterializeResult;
            stableItemPlanContentSetHit = true;
            stableItemPlanContentSetReason = materializedPlanCacheMaterializeResult.reason || 'content-set-hit';
          } else {
            stableItemPlanContentSetReason = materializedPlanCacheMaterializeResult && materializedPlanCacheMaterializeResult.reason || 'content-set-materialize-failed';
          }
        } else {
          stableItemPlanContentSetReason = 'content-set-cache-miss';
        }
      }
    }
    if (materializedPlanCache && materializedPlanCache.fastHit === true) {
      stableItemPlanFastHit = true;
      stableItemPlanFastHitReason = materializedPlanCache.reason || 'fast-hit-stable-item-array-reused-existing-static-bases';
      stableItemPlanFastSplit = materializedPlanCache.fastChunkEligibilitySplit || null;
    } else if (materializedPlanCache) {
      stableItemPlanFastHitReason = materializedPlanCache.reason || 'hit-materialized-from-existing-base-cache';
      if (materializedPlanCache.contentSetHit === true) {
        stableItemPlanContentSetHit = true;
        stableItemPlanContentSetReason = materializedPlanCache.reason || stableItemPlanContentSetReason || 'content-set-hit';
      }
    } else if (materializedPlanCacheRaw && materializedPlanCacheMaterializeResult) {
      stableItemPlanFastHitReason = materializedPlanCacheMaterializeResult.reason || 'stable-plan-materialize-failed';
    }
    var stablePlanKeyDiffDiagnostics = materializedPlanCacheKey
      ? buildStaticMaterializedPlanKeyDiffDiagnostics(materializedPlanCacheKey, materializedPlanExactCacheHit === true)
      : null;
    phaseDiag.staticMaterializedPlanCacheEnabled = materializedPlanCacheEnabled === true;
    phaseDiag.staticMaterializedPlanCacheHit = !!materializedPlanCache;
    phaseDiag.staticMaterializedPlanExactCacheHit = materializedPlanExactCacheHit === true;
    phaseDiag.staticStableItemPlanContentSetHit = stableItemPlanContentSetHit === true;
    phaseDiag.staticStableItemPlanContentSetReason = stableItemPlanContentSetReason || '';
    phaseDiag.staticStableItemPlanContentSetKeyHash = materializedPlanKeyDescriptor && materializedPlanKeyDescriptor.contentSetKeyHash || '';
    phaseDiag.staticMaterializedPlanCacheLookupMs = Math.max(0, nowMs() - materializedPlanCacheLookupStartedAt);
    phaseDiag.staticMaterializedPlanCacheSize = state.staticMaterializedPlanCache ? objectKeyCountForensics(state.staticMaterializedPlanCache) : 0;
    phaseDiag.staticMaterializedContentSetCacheSize = state.staticMaterializedContentSetCache ? objectKeyCountForensics(state.staticMaterializedContentSetCache) : 0;
    phaseDiag.staticStableItemPlanCacheGate = stableItemPlanCacheGate.gate || '';
    phaseDiag.staticStableItemPlanCacheBlockedBy = stableItemPlanCacheGate.blockedBy || '';
    phaseDiag.staticStableItemPlanCacheGateMode = stableItemPlanCacheGate.gateMode || '';
    phaseDiag.pixiPerformanceModeEnabled = stableItemPlanCacheGate.pixiPerformanceModeEnabled === true;
    phaseDiag.verboseStaticDiagnosticsEnabled = stableItemPlanCacheGate.verboseStaticDiagnosticsEnabled === true;
    phaseDiag.chunkInputDiagnosticsSuppressedForStablePlan = stableItemPlanCacheGate.chunkInputDiagnosticsSuppressed === true;
    phaseDiag.stableItemPlanCacheRequiresPerformanceMode = stableItemPlanCacheGate.requiresPerformanceMode === true;
    phaseDiag.staticMaterializedPlanCacheReason = materializedPlanCacheEnabled
      ? (materializedPlanCache ? (stableItemPlanFastHit ? 'fast-hit-stable-item-plan-reused-existing-static-bases' : (stableItemPlanContentSetHit ? 'content-set-hit-reused-existing-static-bases-current-order' : 'hit-stable-item-plan-reused-existing-static-bases')) : (materializedPlanCacheRaw ? ('stale-stable-item-plan:' + String(materializedPlanCacheMaterializeResult && materializedPlanCacheMaterializeResult.reason || 'materialize-failed')) : (materializedPlanContentSetRaw ? ('stale-content-set-plan:' + String(materializedPlanCacheMaterializeResult && materializedPlanCacheMaterializeResult.reason || 'materialize-failed')) : 'miss')))
      : ('blocked:' + (stableItemPlanCacheGate.blockedBy || 'unknown-gate'));
    phaseDiag.staticStableItemPlanFastHitEnabled = stableItemPlanFastHitEnabled === true;
    phaseDiag.staticStableItemPlanFastHit = stableItemPlanFastHit === true;
    phaseDiag.staticStableItemPlanFastHitReason = stableItemPlanFastHitReason || '';
    phaseDiag.staticStableItemPlanFastItemCount = stableItemPlanFastHit && materializedPlanCache && Array.isArray(materializedPlanCache.chunkItems) ? materializedPlanCache.chunkItems.length : 0;
    phaseDiag.staticStableItemPlanFastSplitHit = !!(stableItemPlanFastSplit && Array.isArray(stableItemPlanFastSplit.chunkItems));
    if (stablePlanKeyDiffDiagnostics) {
      phaseDiag.stablePlanKeyDiffEnabled = stablePlanKeyDiffDiagnostics.enabled === true;
      phaseDiag.stablePlanKeyDiffReason = stablePlanKeyDiffDiagnostics.reason || '';
      phaseDiag.stablePlanKeyMissComparedTo = stablePlanKeyDiffDiagnostics.comparedTo || '';
      phaseDiag.stablePlanKeyDiffFieldCount = stablePlanKeyDiffDiagnostics.diffFieldCount || 0;
      phaseDiag.stablePlanKeyDiffFields = stablePlanKeyDiffDiagnostics.diffFields || '';
      phaseDiag.stablePlanKeyDiffTop = stablePlanKeyDiffDiagnostics.topDiffsText || '';
      phaseDiag.stablePlanKeyChangedFromPrevious = stablePlanKeyDiffDiagnostics.changedFromPrevious === true;
      phaseDiag.stablePlanKeyNearestCacheHit = stablePlanKeyDiffDiagnostics.nearestCacheHit === true;
      phaseDiag.stablePlanKeyNearestCacheDiffFieldCount = stablePlanKeyDiffDiagnostics.nearestCacheDiffFieldCount || 0;
      phaseDiag.stablePlanKeyNearestCacheDiffTop = stablePlanKeyDiffDiagnostics.nearestCacheDiffTop || '';
      phaseDiag.stablePlanKeyCurrentHash = stablePlanKeyDiffDiagnostics.currentHash || '';
      phaseDiag.stablePlanKeyPreviousHash = stablePlanKeyDiffDiagnostics.previousHash || '';
      phaseDiag.stablePlanKeyNearestCacheHash = stablePlanKeyDiffDiagnostics.nearestCacheHash || '';
      phaseDiag.stablePlanKeyCurrentContentHash = stablePlanKeyDiffDiagnostics.currentContentHash || '';
      phaseDiag.stablePlanKeyPreviousContentHash = stablePlanKeyDiffDiagnostics.previousContentHash || '';
      phaseDiag.stablePlanKeyContentHashChanged = stablePlanKeyDiffDiagnostics.contentHashChanged === true;
      phaseDiag.stablePlanKeyRunsHashChanged = stablePlanKeyDiffDiagnostics.runsHashChanged === true;
      phaseDiag.stablePlanKeyStaticSharedTexVerChanged = stablePlanKeyDiffDiagnostics.staticSharedTexVerChanged === true;
      phaseDiag.stablePlanKeyFloorBuildCameraChanged = stablePlanKeyDiffDiagnostics.floorBuildCameraChanged === true;
      phaseDiag.stablePlanKeyFloorSurfaceRevisionChanged = stablePlanKeyDiffDiagnostics.floorSurfaceRevisionChanged === true;
      phaseDiag.stablePlanKeyFaceMergeChanged = stablePlanKeyDiffDiagnostics.faceMergeChanged === true;
      phaseDiag.stablePlanKeyCurrentCameraChanged = stablePlanKeyDiffDiagnostics.currentCameraChanged === true;
    }

    var staticMaterializedPlanEntries = [];
    if (materializedPlanCache) {
      chunkItems = materializedPlanCache.chunkItems;
      activeStaticItemBaseCacheKeys = materializedPlanCache.activeStaticItemBaseCacheKeys || Object.create(null);
      chunkEligibilityItemHash = materializedPlanCache.chunkEligibilityItemHash != null ? materializedPlanCache.chunkEligibilityItemHash : chunkEligibilityItemHash;
      evidenceStaticPacketItemBuildCount = 0;
      evidenceStaticPacketItemReuseCount = staticPacketCount;
      projectedGeometryHitCount = staticPacketCount;
      projectedGeometryMissCount = 0;
      chunkDrawDataCacheHitCount = staticPacketCount;
      chunkDrawDataCacheMissCount = 0;
      for (var cachedRunIndex = 0; cachedRunIndex < runs.length; cachedRunIndex += 1) {
        state.activeRunKeys[makeRunKey(state.activeFramePlanId, runs[cachedRunIndex].runStartIndex)] = true;
      }
    } else {
      for (var activeRunIndex = 0; activeRunIndex < runs.length; activeRunIndex += 1) {
        state.activeRunKeys[makeRunKey(state.activeFramePlanId, runs[activeRunIndex].runStartIndex)] = true;
      }
      var chunkPlanStartedAt = nowMs();
      var chunkPlanContextSignature = buildChunkItemPlanContextSignature(viewRotation, visualViewRotation, renderTransform, camera, staticSharedRenderFrameTextureVersionForCache);
      chunkLevelPlanResult = materializeStaticItemsWithChunkLevelPlanCache(
        runs,
        staticPacketCount,
        viewRotation,
        visualViewRotation,
        deps,
        camera,
        renderTransform,
        chunkPlanContextSignature,
        chunkLevelPlanCacheEnabled,
        phaseDiag
      );
      if (chunkLevelPlanResult && chunkLevelPlanResult.ok === true) {
        chunkItems = chunkLevelPlanResult.chunkItems || [];
        activeStaticItemBaseCacheKeys = chunkLevelPlanResult.activeStaticItemBaseCacheKeys || Object.create(null);
        chunkEligibilityItemHash = chunkLevelPlanResult.chunkEligibilityItemHash != null ? chunkLevelPlanResult.chunkEligibilityItemHash : chunkEligibilityItemHash;
        staticMaterializedPlanEntries = chunkLevelPlanResult.staticMaterializedPlanEntries || [];
        evidenceStaticPacketItemBuildCount = chunkLevelPlanResult.staticPacketItemBuildCount || 0;
        evidenceStaticPacketItemReuseCount = chunkLevelPlanResult.staticPacketItemReuseCount || 0;
        projectedGeometryHitCount = chunkLevelPlanResult.projectedGeometryHitCount || 0;
        projectedGeometryMissCount = chunkLevelPlanResult.projectedGeometryMissCount || 0;
        chunkDrawDataCacheHitCount = chunkLevelPlanResult.chunkDrawDataCacheHitCount || 0;
        chunkDrawDataCacheMissCount = chunkLevelPlanResult.chunkDrawDataCacheMissCount || 0;
        evidenceProjectionLookupMs = chunkLevelPlanResult.projectionLookupMs || 0;
        evidencePacketChunkSignatureBuildMs = chunkLevelPlanResult.packetChunkSignatureBuildMs || 0;
        evidencePacketChunkSignatureBuildCount = chunkLevelPlanResult.packetChunkSignatureBuildCount || 0;
        evidenceDrawDataLookupMs = chunkLevelPlanResult.drawDataLookupMs || 0;
        chunkLevelPlanCacheHitCount = chunkLevelPlanResult.chunkPlanHitCount || 0;
        chunkLevelPlanCacheMissCount = chunkLevelPlanResult.chunkPlanMissCount || 0;
        chunkLevelPlanCacheHitPacketCount = chunkLevelPlanResult.chunkPlanHitPacketCount || 0;
        chunkLevelPlanCacheMissPacketCount = chunkLevelPlanResult.chunkPlanMissPacketCount || 0;
        chunkLevelPlanCacheBuiltPacketCount = chunkLevelPlanResult.chunkPlanBuiltPacketCount || 0;
        chunkLevelPlanCacheLookupMs = chunkLevelPlanResult.chunkPlanLookupMs || 0;
        chunkLevelPlanCacheSize = chunkLevelPlanResult.chunkPlanCacheSize || 0;
        chunkLevelPlanCachePrunedCount = chunkLevelPlanResult.chunkPlanPrunedCount || 0;
        chunkLevelPlanCacheHitRate = (chunkLevelPlanCacheHitCount + chunkLevelPlanCacheMissCount) ? Number((chunkLevelPlanCacheHitCount / (chunkLevelPlanCacheHitCount + chunkLevelPlanCacheMissCount)).toFixed(4)) : 0;
      } else {
        failedPacket = chunkLevelPlanResult && chunkLevelPlanResult.failedPacket ? chunkLevelPlanResult.failedPacket : { reason: chunkLevelPlanResult && chunkLevelPlanResult.reason || 'chunk-level-plan-cache-materialize-failed', packetId: null, runStartIndex: null };
      }
      phaseDiag.staticChunkItemPlanCacheMaterializeMs = Math.max(0, nowMs() - chunkPlanStartedAt);
    }
    if (!failedPacket && materializedPlanCacheEnabled && !materializedPlanCache && materializedPlanCacheKey && Array.isArray(staticMaterializedPlanEntries) && staticMaterializedPlanEntries.length === staticPacketCount) {
      putStaticMaterializedPlanCache(materializedPlanCacheKey, {
        entries: staticMaterializedPlanEntries,
        contentSetKey: materializedPlanContentSetKey,
        contentSetHash: materializedPlanKeyDescriptor && materializedPlanKeyDescriptor.contentHash || '',
        chunkEligibilityItemHash: chunkEligibilityItemHash,
        staticPacketCount: staticPacketCount,
        reusesExistingCaches: 'staticPacketItemBaseCache,chunkEligibilitySplitCache,orderRunPlanCache',
        doesNotCache: 'projectedGeometry,drawData,renderTransform,spritePlacement,materializedChunkItems'
      });
      phaseDiag.staticMaterializedPlanCacheSize = state.staticMaterializedPlanCache ? objectKeyCountForensics(state.staticMaterializedPlanCache) : 0;
      phaseDiag.staticMaterializedContentSetCacheSize = state.staticMaterializedContentSetCache ? objectKeyCountForensics(state.staticMaterializedContentSetCache) : 0;
    }
    evidenceStaticPacketItemCacheHitRate = (evidenceStaticPacketItemBuildCount + evidenceStaticPacketItemReuseCount)
      ? Number((evidenceStaticPacketItemReuseCount / (evidenceStaticPacketItemBuildCount + evidenceStaticPacketItemReuseCount)).toFixed(4))
      : 0;
    var pruneStartedAt = nowMs();
    var pruneResult = pruneStaticPacketItemBaseCache(activeStaticItemBaseCacheKeys);
    var pruneStaticPacketItemBaseCacheMs = Math.max(0, nowMs() - pruneStartedAt);
    evidenceStaticPacketItemCachePrunedCount = pruneResult.removed;
    evidenceStaticPacketItemCacheSize = pruneResult.size;

    var evidenceStaticPacketItemBuildMs = Math.max(0, nowMs() - evidenceStaticItemBuildStartedAt);
    phaseDiag.staticPacketItemLoopMs = evidenceStaticPacketItemBuildMs;
    phaseDiag.staticPacketItemBuildCount = evidenceStaticPacketItemBuildCount;
    phaseDiag.staticPacketItemReuseCount = evidenceStaticPacketItemReuseCount;
    phaseDiag.staticChunkItemPlanCacheEnabled = chunkLevelPlanCacheEnabled === true;
    phaseDiag.staticChunkItemPlanCacheHitCount = chunkLevelPlanCacheHitCount;
    phaseDiag.staticChunkItemPlanCacheMissCount = chunkLevelPlanCacheMissCount;
    phaseDiag.staticChunkItemPlanCacheHitRate = chunkLevelPlanCacheHitRate;
    phaseDiag.staticChunkItemPlanCacheHitPacketCount = chunkLevelPlanCacheHitPacketCount;
    phaseDiag.staticChunkItemPlanCacheMissPacketCount = chunkLevelPlanCacheMissPacketCount;
    phaseDiag.staticChunkItemPlanCacheBuiltPacketCount = chunkLevelPlanCacheBuiltPacketCount;
    phaseDiag.staticChunkItemPlanCacheLookupMs = Number(toNumber(chunkLevelPlanCacheLookupMs, 0).toFixed(3));
    phaseDiag.staticChunkItemPlanCacheSize = chunkLevelPlanCacheSize;
    phaseDiag.staticChunkItemPlanCachePrunedCount = chunkLevelPlanCachePrunedCount;
    phaseDiag.projectedGeometryCacheHitCount = projectedGeometryHitCount;
    phaseDiag.projectedGeometryCacheMissCount = projectedGeometryMissCount;
    phaseDiag.staticPacketProjectionLookupMs = evidenceProjectionLookupMs;
    phaseDiag.staticPacketChunkSignatureBuildMs = evidencePacketChunkSignatureBuildMs;
    phaseDiag.staticPacketDrawDataLookupMs = evidenceDrawDataLookupMs;
    phaseDiag.pruneStaticPacketItemBaseCacheMs = pruneStaticPacketItemBaseCacheMs;
    phaseDiag.pruneStaticPacketItemBaseCacheSkipped = pruneResult.skipped === true;
    phaseDiag.pruneStaticPacketItemBaseCacheReason = pruneResult.reason || '';
    phaseDiag.pruneStaticPacketItemBaseCacheActiveKeyCount = pruneResult.activeKeyCount != null ? pruneResult.activeKeyCount : null;
    phaseDiag.pruneStaticPacketItemBaseCacheKeyCount = pruneResult.cacheKeyCount != null ? pruneResult.cacheKeyCount : null;
    phaseDiag.pruneStaticPacketItemBaseCacheEffectiveLimit = pruneResult.effectiveLimit != null ? pruneResult.effectiveLimit : null;
    phaseDiag.lastPhase = failedPacket ? 'static-packet-item-loop-failed' : 'static-packet-item-loop';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);

    function drawPacketItemsWithPersistentGraphics(items) {
      var out = {
        ok: false,
        graphicsIndex: 0,
        packetDrawCount: 0,
        polygonDrawCount: 0,
        overlayDrawCount: 0,
        terrainBoundaryDrawCount: 0,
        persistentGraphicsReuseCount: 0,
        persistentGraphicsRebuildCount: 0,
        failedPacket: null
      };
      for (var ii = 0; ii < items.length; ii += 1) {
        var item = items[ii];
        var graphics = getGraphics(out.graphicsIndex, container, false);
        if (!graphics) {
          out.failedPacket = { reason: 'graphics-allocation-failed', packetId: item.packet && item.packet.id || null, runStartIndex: item.runStartIndex };
          break;
        }
        applyPersistentGraphicsMetadata(graphics, item.packet, item.runStartIndex, item.packetIndex);
        if (!item.renderSignature) {
          var dynamicRenderSignatureStartedAt = nowMs();
          item.renderSignature = buildPacketPersistentGraphicsSignature(item.packet, item.projected, camera, renderTransform, item.runStartIndex, item.packetIndex, deps, item.staticCacheViewRotation);
          evidencePacketSignatureBuildMs += Math.max(0, nowMs() - dynamicRenderSignatureStartedAt);
          evidencePacketSignatureBuildCount += 1;
        }
        var reusedPersistentGraphics = false;
        var drawResult = null;
        try {
          reusedPersistentGraphics = graphics.__pixiStaticWorldPacketRenderSignature === item.renderSignature && graphics.__pixiStaticWorldPacketDrawOk === true;
        } catch (_) { reusedPersistentGraphics = false; }
        if (reusedPersistentGraphics) {
          drawResult = graphics.__pixiStaticWorldPacketDrawStats || { ok: true, polygonDrawCount: 1, outlineCount: 0, terrainBoundaryCount: 0, overlayCount: 0, reusedPersistentGraphics: true };
          drawResult.reusedPersistentGraphics = true;
        } else {
          clearGraphics(graphics);
          applyPersistentGraphicsMetadata(graphics, item.packet, item.runStartIndex, item.packetIndex);
          drawResult = drawPacket(graphics, item.packet, item.projected, camera, renderTransform, deps);
          if (drawResult && drawResult.ok === true) {
            try { graphics.__pixiStaticWorldPacketRenderSignature = item.renderSignature; } catch (_) {}
            try { graphics.__pixiStaticWorldPacketDrawOk = true; } catch (_) {}
            try { graphics.__pixiStaticWorldPacketDrawStats = Object.assign({}, drawResult); } catch (_) {}
          }
        }
        if (!drawResult || drawResult.ok !== true) {
          out.failedPacket = {
            reason: drawResult && drawResult.reason || 'packet-draw-failed',
            packetId: item.packet && item.packet.id || null,
            runStartIndex: item.runStartIndex,
            pointCount: item.projected && Array.isArray(item.projected.pointsNoCamera) ? item.projected.pointsNoCamera.length : 0,
            loopCount: item.projected && Array.isArray(item.projected.loopsNoCamera) ? item.projected.loopsNoCamera.length : 0,
            worldPointCount: getPacketWorldPointCount(item.packet),
            worldLoopCount: getPacketWorldLoopCount(item.packet),
            projectionDependencyAvailable: hasProjectionDependency(deps),
            projectedRendererNeutral: !!(item.projected && item.projected.rendererNeutral),
            projectedOwner: item.projected && item.projected.owner ? String(item.projected.owner) : null,
            hasFill: !!(item.packet && item.packet.fill),
            hasStroke: !!(item.packet && item.packet.stroke),
            graphicsCapabilities: getGraphicsCapabilities(graphics)
          };
          break;
        }
        out.packetDrawCount += 1;
        if (drawResult && drawResult.reusedPersistentGraphics === true) out.persistentGraphicsReuseCount += 1;
        else out.persistentGraphicsRebuildCount += 1;
        out.polygonDrawCount += toNumber(drawResult.polygonDrawCount, 0);
        out.overlayDrawCount += toNumber(drawResult.overlayCount, 0);
        out.terrainBoundaryDrawCount += toNumber(drawResult.terrainBoundaryCount, 0);
        out.graphicsIndex += 1;
      }
      out.ok = !out.failedPacket && out.packetDrawCount === items.length;
      return out;
    }

    var chunkEligibilitySplit = { chunkItems: chunkItems, playerSensitiveItems: [], playerSensitivePacketCount: 0 };
    var playerSensitiveDraw = null;
    if (!failedPacket) {
      var chunkEligibilitySplitResult = null;
      if (stableItemPlanFastSplit && Array.isArray(stableItemPlanFastSplit.chunkItems)) {
        chunkEligibilitySplitResult = {
          split: stableItemPlanFastSplit,
          totalMs: 0,
          cacheHit: true,
          buildCount: 0,
          reuseCount: 1,
          cacheHitRate: 1,
          rebuildReason: 'fast-hit-reused-stable-item-plan-chunk-eligibility-split',
          materializeMs: 0,
          computeMs: 0,
          cacheSize: state.chunkEligibilitySplitCache ? objectKeyCountForensics(state.chunkEligibilitySplitCache) : 0,
          pruneRemovedCount: 0
        };
      } else {
        chunkEligibilitySplitResult = splitChunkTextureEligibleItemsCached(chunkItems, chunkEligibilityItemHash);
      }
      chunkEligibilitySplit = chunkEligibilitySplitResult && chunkEligibilitySplitResult.split ? chunkEligibilitySplitResult.split : splitChunkTextureEligibleItems(chunkItems);
      evidenceChunkEligibilitySplitMs = chunkEligibilitySplitResult && chunkEligibilitySplitResult.totalMs != null ? toNumber(chunkEligibilitySplitResult.totalMs, 0) : 0;
      evidenceChunkEligibilitySplitCacheHit = !!(chunkEligibilitySplitResult && chunkEligibilitySplitResult.cacheHit === true);
      evidenceChunkEligibilitySplitBuildCount = chunkEligibilitySplitResult && chunkEligibilitySplitResult.buildCount != null ? toNumber(chunkEligibilitySplitResult.buildCount, 0) : 0;
      evidenceChunkEligibilitySplitReuseCount = chunkEligibilitySplitResult && chunkEligibilitySplitResult.reuseCount != null ? toNumber(chunkEligibilitySplitResult.reuseCount, 0) : 0;
      evidenceChunkEligibilitySplitCacheHitRate = chunkEligibilitySplitResult && chunkEligibilitySplitResult.cacheHitRate != null ? toNumber(chunkEligibilitySplitResult.cacheHitRate, 0) : 0;
      evidenceChunkEligibilitySplitRebuildReason = chunkEligibilitySplitResult && chunkEligibilitySplitResult.rebuildReason ? String(chunkEligibilitySplitResult.rebuildReason) : '';
      evidenceChunkEligibilitySplitMaterializeMs = chunkEligibilitySplitResult && chunkEligibilitySplitResult.materializeMs != null ? toNumber(chunkEligibilitySplitResult.materializeMs, 0) : 0;
      evidenceChunkEligibilitySplitComputeMs = chunkEligibilitySplitResult && chunkEligibilitySplitResult.computeMs != null ? toNumber(chunkEligibilitySplitResult.computeMs, 0) : 0;
      evidenceChunkEligibilitySplitCacheSize = chunkEligibilitySplitResult && chunkEligibilitySplitResult.cacheSize != null ? toNumber(chunkEligibilitySplitResult.cacheSize, 0) : 0;
      evidenceChunkEligibilitySplitCachePrunedCount = chunkEligibilitySplitResult && chunkEligibilitySplitResult.pruneRemovedCount != null ? toNumber(chunkEligibilitySplitResult.pruneRemovedCount, 0) : 0;
      if (materializedPlanCacheEnabled && materializedPlanCacheKey && !stableItemPlanFastSplit) {
        updateStaticMaterializedPlanCacheFastPayload(materializedPlanCacheKey, chunkItems, activeStaticItemBaseCacheKeys, chunkEligibilitySplit);
      }
      phaseDiag.chunkEligibilitySplitMs = evidenceChunkEligibilitySplitMs;
      phaseDiag.lastPhase = 'chunk-eligibility-split';
      state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
      var orderRunDiagnosticsStartedAt = nowMs();
      orderRunCacheDiagnosticsSummary = buildOrderRunCacheDiagnostics(chunkItems, chunkEligibilitySplit, order, assetClassificationSummary);
      evidenceOrderRunDiagnosticsBuildMs = Math.max(0, nowMs() - orderRunDiagnosticsStartedAt);
      phaseDiag.orderRunDiagnosticsBuildMs = evidenceOrderRunDiagnosticsBuildMs;
      phaseDiag.lastPhase = 'order-run-diagnostics';
      state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
      emitOrderRunCacheDiagnostics(orderRunCacheDiagnosticsSummary);
      if (chunkEligibilitySplit.chunkItems.length > 0) {
        var chunkRenderTextureStartedAt = nowMs();
        chunkRenderTextureSummary = tryDrawChunkRenderTextureFrame(chunkEligibilitySplit.chunkItems, container, renderTransform);
        phaseDiag.chunkRenderTextureFrameMs = Math.max(0, nowMs() - chunkRenderTextureStartedAt);
        phaseDiag.lastPhase = 'chunk-render-texture-frame';
        state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
      } else {
        clearUnusedChunkSprites(0);
        chunkRenderTextureSummary = {
          ok: true,
          renderer: 'pixi-static-world-chunk-render-texture-cache',
          chunkRenderTextureAdopted: true,
          chunkRenderTextureDiagnosticOnly: false,
          chunkRenderTextureCount: 0,
          chunkRenderTextureHitCount: 0,
          chunkRenderTextureMissCount: 0,
          chunkRenderTextureHitRate: 1,
          chunkRenderTextureReusablePacketCount: 0,
          chunkRenderTextureRebuildPacketCount: 0,
          chunkRenderTextureLargestPacketCount: 0,
          chunkRenderTextureLargestChunkKey: '',
          chunkRenderTextureWallMs: 0,
          chunkRenderTexturePreservesFramePlanRuns: false,
          chunkRenderTextureExternalChunksIgnorePlayerRunSplits: true,
          chunkRenderTextureExternalChunksUseStableDepthBands: false,
          chunkRenderTextureExternalChunkGroupingMode: getExternalChunkCacheGroupingMode(),
          chunkRenderTextureStableDepthBandPathUsed: false,
          chunkRenderTexturePlayerChunkRemainsDynamic: true,
          chunkRenderTextureTransformOnlySprites: !!(renderTransform && renderTransform.active === true),
          chunkRenderTextureCacheSpace: renderTransform && renderTransform.active === true ? 'floor-build-screen-space' : 'current-screen-space',
          chunkRenderTextureCurrentCameraIndependent: !!(renderTransform && renderTransform.active === true)
        };
        phaseDiag.chunkRenderTextureFrameMs = 0;
        phaseDiag.lastPhase = 'chunk-render-texture-empty';
        state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
      }
      if (chunkRenderTextureSummary && chunkRenderTextureSummary.ok === true) {
        playerSensitiveGraphicsItems = chunkEligibilitySplit.playerSensitiveItems;
        orderRunActiveEnabled = isOrderRunRenderTextureCacheEnabled() && !!(orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.eligibleForActiveOrderRunCache === true);
        orderRunActiveReason = orderRunActiveEnabled ? 'active-order-run-rendertexture-cache' : (isOrderRunRenderTextureCacheEnabled() ? 'diagnostics-not-eligible' : 'disabled-by-localstorage');
        if (orderRunActiveEnabled && chunkEligibilitySplit.playerSensitiveItems.length > 0) {
          var orderRunRenderTextureStartedAt = nowMs();
          orderRunRenderTextureSummary = tryDrawOrderRunRenderTextureFrame(
            chunkEligibilitySplit.playerSensitiveItems,
            container,
            renderTransform,
            chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? chunkRenderTextureSummary.chunkRenderTextureCount : 0
          );
          phaseDiag.orderRunRenderTextureFrameMs = Math.max(0, nowMs() - orderRunRenderTextureStartedAt);
          phaseDiag.lastPhase = 'order-run-render-texture-frame';
          state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
          if (orderRunRenderTextureSummary && orderRunRenderTextureSummary.ok === true) {
            orderRunCachedPacketCount = toNumber(orderRunRenderTextureSummary.orderRunRenderTextureCachedPacketCount, 0);
            playerSensitiveGraphicsItems = Array.isArray(orderRunRenderTextureSummary.graphicsItems) ? orderRunRenderTextureSummary.graphicsItems : [];
            clearUnusedChunkSprites(toNumber(orderRunRenderTextureSummary.orderRunRenderTextureSpriteEndIndex, toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0)));
          } else {
            orderRunActiveEnabled = false;
            orderRunActiveReason = orderRunRenderTextureSummary && orderRunRenderTextureSummary.reason ? 'fallback:' + String(orderRunRenderTextureSummary.reason) : 'fallback:order-run-rendertexture-failed';
            orderRunCachedPacketCount = 0;
            playerSensitiveGraphicsItems = chunkEligibilitySplit.playerSensitiveItems;
            clearUnusedChunkSprites(toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0));
          }
        } else {
          clearUnusedChunkSprites(toNumber(chunkRenderTextureSummary.chunkRenderTextureCount, 0));
        }
        var playerSensitiveDrawStartedAt = nowMs();
        playerSensitiveDraw = drawPacketItemsWithPersistentGraphics(playerSensitiveGraphicsItems);
        evidencePlayerSensitiveDrawMs += Math.max(0, nowMs() - playerSensitiveDrawStartedAt);
        phaseDiag.persistentGraphicsMs = evidencePlayerSensitiveDrawMs;
        phaseDiag.lastPhase = 'player-sensitive-persistent-graphics';
        state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
        if (playerSensitiveDraw && playerSensitiveDraw.ok === true) {
          graphicsIndex = playerSensitiveDraw.graphicsIndex;
          packetDrawCount = chunkEligibilitySplit.chunkItems.length + orderRunCachedPacketCount + playerSensitiveDraw.packetDrawCount;
          polygonDrawCount = chunkEligibilitySplit.chunkItems.length + orderRunCachedPacketCount + playerSensitiveDraw.polygonDrawCount;
          overlayDrawCount = playerSensitiveDraw.overlayDrawCount;
          terrainBoundaryDrawCount = playerSensitiveDraw.terrainBoundaryDrawCount;
          persistentGraphicsReuseCount = playerSensitiveDraw.persistentGraphicsReuseCount;
          persistentGraphicsRebuildCount = playerSensitiveDraw.persistentGraphicsRebuildCount;
        } else {
          failedPacket = playerSensitiveDraw && playerSensitiveDraw.failedPacket ? playerSensitiveDraw.failedPacket : { reason: 'player-sensitive-persistent-graphics-failed', packetId: null, runStartIndex: null };
        }
      } else {
        clearUnusedChunkSprites(0);
        var fallbackDrawStartedAt = nowMs();
        var fallbackDraw = drawPacketItemsWithPersistentGraphics(chunkItems);
        var fallbackDrawMs = Math.max(0, nowMs() - fallbackDrawStartedAt);
        evidencePlayerSensitiveDrawMs += fallbackDrawMs;
        phaseDiag.fallbackPersistentGraphicsMs = fallbackDrawMs;
        phaseDiag.persistentGraphicsMs = evidencePlayerSensitiveDrawMs;
        phaseDiag.lastPhase = 'fallback-persistent-graphics';
        state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
        graphicsIndex = fallbackDraw.graphicsIndex;
        packetDrawCount = fallbackDraw.packetDrawCount;
        polygonDrawCount = fallbackDraw.polygonDrawCount;
        overlayDrawCount = fallbackDraw.overlayDrawCount;
        terrainBoundaryDrawCount = fallbackDraw.terrainBoundaryDrawCount;
        persistentGraphicsReuseCount = fallbackDraw.persistentGraphicsReuseCount;
        persistentGraphicsRebuildCount = fallbackDraw.persistentGraphicsRebuildCount;
        failedPacket = fallbackDraw.failedPacket;
        chunkRenderTextureSummary = Object.assign({ ok: false, reason: 'chunk-render-texture-fallback-to-persistent-graphics' }, chunkRenderTextureSummary || {});
      }
    }


    if (failedPacket || packetDrawCount !== staticPacketCount) {
      clearUnusedGraphics(0);
      publishBeginFramePhaseDiagnostics(phaseDiag, failedPacket && failedPacket.reason || 'incomplete-static-category-draw', {
        ok: false,
        lastPhase: failedPacket ? 'failed-packet' : 'packet-count-mismatch',
        packetDrawCount: packetDrawCount,
        staticPacketCount: staticPacketCount,
        failedPacketReason: failedPacket && failedPacket.reason ? String(failedPacket.reason) : '',
        failedPacketId: failedPacket && failedPacket.packetId || null
      }, true);
      return rejectFrame(failedPacket && failedPacket.reason || 'incomplete-static-category-draw', {
        source: 'beginFrame',
        packetDrawCount: packetDrawCount,
        staticPacketCount: staticPacketCount,
        failedPacketId: failedPacket && failedPacket.packetId || null,
        failedRunStartIndex: failedPacket && failedPacket.runStartIndex != null ? failedPacket.runStartIndex : null,
        failedPointCount: failedPacket && failedPacket.pointCount != null ? failedPacket.pointCount : null,
        failedLoopCount: failedPacket && failedPacket.loopCount != null ? failedPacket.loopCount : null,
        failedWorldPointCount: failedPacket && failedPacket.worldPointCount != null ? failedPacket.worldPointCount : null,
        failedWorldLoopCount: failedPacket && failedPacket.worldLoopCount != null ? failedPacket.worldLoopCount : null,
        projectionDependencyAvailable: failedPacket && failedPacket.projectionDependencyAvailable === true,
        failedProjectedRendererNeutral: failedPacket && failedPacket.projectedRendererNeutral === true,
        failedProjectedOwner: failedPacket && failedPacket.projectedOwner ? failedPacket.projectedOwner : null,
        failedHasFill: failedPacket && failedPacket.hasFill === true,
        failedHasStroke: failedPacket && failedPacket.hasStroke === true,
        graphicsCapabilities: failedPacket && failedPacket.graphicsCapabilities ? failedPacket.graphicsCapabilities : null
      });
    }

    try {
      optimizationPlacementAuditSummary = buildOptimizationPlacementAudit(
        chunkItems,
        typeof chunkEligibilitySplit !== 'undefined' ? chunkEligibilitySplit : { chunkItems: chunkItems, playerSensitiveItems: [], playerSensitivePacketCount: 0 },
        chunkRenderTextureSummary,
        orderRunRenderTextureSummary,
        orderRunCacheDiagnosticsSummary,
        playerSensitiveDraw
      );
    } catch (auditErr) {
      optimizationPlacementAuditSummary = {
        step: STEP,
        phase: PHASE,
        source: 'pixi-static-world-consumer.optimization-placement-audit.error',
        auditError: auditErr && auditErr.message ? String(auditErr.message) : String(auditErr)
      };
    }
    try {
      safeInputPlanAuditSummary = buildSafeInputPlanAudit(
        chunkItems,
        typeof chunkEligibilitySplit !== 'undefined' ? chunkEligibilitySplit : { chunkItems: chunkItems, playerSensitiveItems: [], playerSensitivePacketCount: 0 },
        chunkRenderTextureSummary,
        orderRunRenderTextureSummary,
        playerSensitiveDraw,
        meta,
        renderTransform
      );
    } catch (safeAuditErr) {
      safeInputPlanAuditSummary = {
        step: STEP,
        phase: PHASE,
        source: 'pixi-static-world-consumer.safe-input-plan-audit.error',
        auditError: safeAuditErr && safeAuditErr.message ? String(safeAuditErr.message) : String(safeAuditErr)
      };
    }

    clearUnusedGraphics(graphicsIndex);
    var playerChunkDebugOverlaySummary = null;
    try {
      playerChunkDebugOverlaySummary = updatePlayerChunkDebugOverlay(
        container,
        typeof chunkEligibilitySplit !== 'undefined' ? chunkEligibilitySplit : { chunkItems: chunkItems, playerSensitiveItems: [], playerSensitivePacketCount: 0 },
        chunkRenderTextureSummary,
        orderRunRenderTextureSummary,
        playerSensitiveDraw,
        playerSensitiveGraphicsItems,
        camera,
        renderTransform,
        deps
      );
    } catch (overlayErr) {
      try { emit('player-chunk-debug-overlay', { step: STEP, phase: PHASE, frameSeq: state.frameSeq, overlayError: overlayErr && overlayErr.message ? String(overlayErr.message) : String(overlayErr) }); } catch (_) {}
    }
    state.activeCategoryAdopted = true;
    state.totalPacketDrawCount += packetDrawCount;
    state.totalFrameAdoptionCount += 1;
    var wallMs = Math.max(0, nowMs() - startAt);
    var containerSortStartedAt = nowMs();
    try { if (container && typeof container.sortChildren === 'function') container.sortChildren(); } catch (_) {}
    evidenceContainerSortMs = Math.max(0, nowMs() - containerSortStartedAt);
    phaseDiag.containerSortMs = evidenceContainerSortMs;
    phaseDiag.lastPhase = 'container-sort';
    state.lastBeginFramePhaseDiagnostics = Object.assign({}, phaseDiag);
    if (!chunkInputDiagnosticsSuppressed && chunkInputApi && typeof chunkInputApi.commitFrame === 'function') {
      try {
        chunkInputSummary = chunkInputApi.commitFrame({
          source: 'pixi-static-world-packet-consumer',
          packetDrawCount: packetDrawCount,
          graphicsUsedCount: graphicsIndex,
          persistentGraphicsReusedCount: persistentGraphicsReuseCount,
          persistentGraphicsRebuiltCount: persistentGraphicsRebuildCount
        });
      } catch (_) { chunkInputSummary = null; }
    }
    state.lastSummary = {
      ok: true,
      renderer: 'pixi-static-world-packet-consumer',
      step: STEP,
      phase: PHASE,
      activeBackend: getActiveBackend(),
      projectionDependencyAvailable: hasProjectionDependency(deps),
      framePlanId: state.activeFramePlanId,
      frameSeq: state.frameSeq,
      pixiDrawsStaticWorldPackets: true,
      pixiDrawsStaticPacketRuns: true,
      pixiStaticWorldConsumesFramePlanOrder: true,
      pixiStaticWorldConsumesStaticFacePackets: true,
      pixiStaticWorldUsesSharedProjectedGeometry: true,
      pixiStaticWorldUsesRendererNeutralProjectedGeometry: true,
      pixiStaticWorldUsesPacketMaterialColors: true,
      pixiStaticWorldBypassesCanvas2dBitmapRunCache: true,
      canvas2dStaticBitmapRunCacheUsedForPixi: false,
      canvas2dSkipsStaticWorldPackets: true,
      canvas2dSkipsAdoptedStaticRuns: true,
      adoptionPolicy: 'whole-static-world-face-packet-category',
      depthInterleavingMode: 'pixi-frameplan-zindex-static-plus-player',
      reusesFramePlanOrderForDepth: true,
      staticRunCount: runs.length,
      staticPacketCount: staticPacketCount,
      assetRenderableClassificationDiagnosticsActive: true,
      assetClassificationSummary: assetClassificationSummary || null,
      assetClassificationStaticPacketCount: assetClassificationSummary ? assetClassificationSummary.staticPacketCount : 0,
      assetClassificationTerrainFacePacketCount: assetClassificationSummary ? assetClassificationSummary.terrainFacePacketCount : 0,
      assetClassificationVoxelizedPrefabFacePacketCount: assetClassificationSummary ? assetClassificationSummary.voxelizedPrefabFacePacketCount : 0,
      assetClassificationAtomicSpriteCount: assetClassificationSummary ? assetClassificationSummary.atomicSpriteCount : 0,
      assetClassificationLargeAtomicSpriteCount: assetClassificationSummary ? assetClassificationSummary.largeAtomicSpriteCount : 0,
      assetClassificationBillboardSpriteCount: assetClassificationSummary ? assetClassificationSummary.billboardSpriteCount : 0,
      assetClassificationDepthIntervalObjectCount: assetClassificationSummary ? assetClassificationSummary.depthIntervalObjectCount : 0,
      assetClassificationAtomicSpriteRiskLevel: assetClassificationSummary ? assetClassificationSummary.atomicSpriteRiskLevel : 'unknown',
      packetDrawCount: packetDrawCount,
      graphicsUsedCount: graphicsIndex,
      chunkRenderTextureCacheEnabled: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.ok === true),
      chunkRenderTextureAdopted: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureAdopted === true),
      chunkRenderTextureFallbackReason: chunkRenderTextureSummary && chunkRenderTextureSummary.reason ? String(chunkRenderTextureSummary.reason) : '',
      chunkRenderTextureCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? chunkRenderTextureSummary.chunkRenderTextureCount : 0,
      chunkRenderTextureHitCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureHitCount != null ? chunkRenderTextureSummary.chunkRenderTextureHitCount : 0,
      chunkRenderTextureMissCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureMissCount != null ? chunkRenderTextureSummary.chunkRenderTextureMissCount : 0,
      chunkRenderTextureHitRate: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureHitRate != null ? chunkRenderTextureSummary.chunkRenderTextureHitRate : 0,
      chunkRenderTextureReusablePacketCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureReusablePacketCount != null ? chunkRenderTextureSummary.chunkRenderTextureReusablePacketCount : 0,
      chunkRenderTextureRebuildPacketCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureRebuildPacketCount != null ? chunkRenderTextureSummary.chunkRenderTextureRebuildPacketCount : 0,
      chunkRenderTextureLargestPacketCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureLargestPacketCount != null ? chunkRenderTextureSummary.chunkRenderTextureLargestPacketCount : 0,
      chunkRenderTextureWallMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureWallMs != null ? chunkRenderTextureSummary.chunkRenderTextureWallMs : 0,
      chunkRenderTextureGroupBuildMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureGroupBuildMs != null ? chunkRenderTextureSummary.chunkRenderTextureGroupBuildMs : 0,
      chunkRenderTextureSignatureBuildMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureSignatureBuildMs != null ? chunkRenderTextureSummary.chunkRenderTextureSignatureBuildMs : 0,
      chunkRenderTextureCacheLookupMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCacheLookupMs != null ? chunkRenderTextureSummary.chunkRenderTextureCacheLookupMs : 0,
      chunkRenderTextureTextureCreateMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureTextureCreateMs != null ? chunkRenderTextureSummary.chunkRenderTextureTextureCreateMs : 0,
      chunkRenderTextureGraphicsCreateMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureGraphicsCreateMs != null ? chunkRenderTextureSummary.chunkRenderTextureGraphicsCreateMs : 0,
      chunkRenderTextureCommandDrawMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCommandDrawMs != null ? chunkRenderTextureSummary.chunkRenderTextureCommandDrawMs : 0,
      chunkRenderTextureRenderToTextureMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureRenderToTextureMs != null ? chunkRenderTextureSummary.chunkRenderTextureRenderToTextureMs : 0,
      chunkRenderTextureTextureDestroyMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureTextureDestroyMs != null ? chunkRenderTextureSummary.chunkRenderTextureTextureDestroyMs : 0,
      chunkRenderTextureSpriteApplyMs: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureSpriteApplyMs != null ? chunkRenderTextureSummary.chunkRenderTextureSpriteApplyMs : 0,
      chunkRenderTextureCreateCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCreateCount != null ? chunkRenderTextureSummary.chunkRenderTextureCreateCount : 0,
      chunkRenderTextureReuseCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureReuseCount != null ? chunkRenderTextureSummary.chunkRenderTextureReuseCount : 0,
      chunkRenderTextureDestroyCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDestroyCount != null ? chunkRenderTextureSummary.chunkRenderTextureDestroyCount : 0,
      chunkRenderTextureUploadCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureUploadCount != null ? chunkRenderTextureSummary.chunkRenderTextureUploadCount : 0,
      chunkRenderTexturePreservesFramePlanRuns: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTexturePreservesFramePlanRuns === true),
      chunkRenderTextureExternalChunksIgnorePlayerRunSplits: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureExternalChunksIgnorePlayerRunSplits === true),
      chunkRenderTextureExternalChunksUseStableDepthBands: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureExternalChunksUseStableDepthBands === true),
      chunkRenderTextureExternalChunkGroupingMode: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureExternalChunkGroupingMode ? String(chunkRenderTextureSummary.chunkRenderTextureExternalChunkGroupingMode) : getExternalChunkCacheGroupingMode(),
      chunkRenderTextureStableDepthBandPathUsed: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureStableDepthBandPathUsed === true),
      chunkRenderTextureStableDepthBandBucketSize: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureStableDepthBandBucketSize != null ? chunkRenderTextureSummary.chunkRenderTextureStableDepthBandBucketSize : getStableDepthBandBucketSize(),
      chunkRenderTexturePlayerChunkRemainsDynamic: !(orderRunActiveEnabled && orderRunCachedPacketCount > 0),
      chunkRenderTextureTransformOnlySprites: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureTransformOnlySprites === true),
      chunkRenderTextureCacheSpace: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCacheSpace ? String(chunkRenderTextureSummary.chunkRenderTextureCacheSpace) : '',
      chunkRenderTextureCurrentCameraIndependent: !!(chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCurrentCameraIndependent === true),
      chunkRenderTextureDepthDiagnosticGroupCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthDiagnosticGroupCount != null ? chunkRenderTextureSummary.chunkRenderTextureDepthDiagnosticGroupCount : 0,
      chunkRenderTextureDepthRiskGroupCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthRiskGroupCount != null ? chunkRenderTextureSummary.chunkRenderTextureDepthRiskGroupCount : 0,
      chunkRenderTextureDepthMaxOrderSpan: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthMaxOrderSpan != null ? chunkRenderTextureSummary.chunkRenderTextureDepthMaxOrderSpan : 0,
      chunkRenderTextureDepthMaxSortSpan: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthMaxSortSpan != null ? chunkRenderTextureSummary.chunkRenderTextureDepthMaxSortSpan : 0,
      chunkRenderTextureDepthMaxDepthSpan: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthMaxDepthSpan != null ? chunkRenderTextureSummary.chunkRenderTextureDepthMaxDepthSpan : 0,
      chunkRenderTextureDepthMaxCellZSpan: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureDepthMaxCellZSpan != null ? chunkRenderTextureSummary.chunkRenderTextureDepthMaxCellZSpan : 0,
      chunkRenderTexturePlayerSensitiveExclusionEnabled: true,
      chunkRenderTexturePlayerSensitivePacketCount: chunkEligibilitySplit && chunkEligibilitySplit.playerSensitivePacketCount != null ? chunkEligibilitySplit.playerSensitivePacketCount : 0,
      chunkRenderTextureEligiblePacketCount: chunkEligibilitySplit && chunkEligibilitySplit.chunkItems ? chunkEligibilitySplit.chunkItems.length : staticPacketCount,
      dynamicStaticGraphicsCount: Array.isArray(playerSensitiveGraphicsItems) ? playerSensitiveGraphicsItems.length : (chunkEligibilitySplit && chunkEligibilitySplit.playerSensitiveItems ? chunkEligibilitySplit.playerSensitiveItems.length : 0),
      dynamicStaticGraphicsReusedCount: playerSensitiveDraw && playerSensitiveDraw.persistentGraphicsReuseCount != null ? playerSensitiveDraw.persistentGraphicsReuseCount : 0,
      dynamicStaticGraphicsRebuiltCount: playerSensitiveDraw && playerSensitiveDraw.persistentGraphicsRebuildCount != null ? playerSensitiveDraw.persistentGraphicsRebuildCount : 0,
      playerLocalFaceDemergeExpected: !!(getStableLocalDemergeLastState() && getStableLocalDemergeLastState().active === true && isGlobalFaceMergeActiveForPlayerLocalDemerge()),
      playerLocalFaceDemergeMode: getStableLocalDemergeLastState() && getStableLocalDemergeLastState().mode ? String(getStableLocalDemergeLastState().mode) : '',
      playerLocalFaceDemergeChunkKey: getStableLocalDemergeLastState() && getStableLocalDemergeLastState().playerInteractionChunkKey ? String(getStableLocalDemergeLastState().playerInteractionChunkKey) : '',
      playerLocalFaceDemergeCellKey: getStableLocalDemergeLastState() && getStableLocalDemergeLastState().playerInteractionCellKey ? String(getStableLocalDemergeLastState().playerInteractionCellKey) : '',
      chunkRenderTexturePlayerSensitivePolicy: orderRunActiveEnabled ? 'external-chunks-chunk-key-only-player-chunk-order-run-cache-strict' : 'external-chunks-chunk-key-only-player-chunk-dynamic-strict',
      orderRunCacheDiagnosticsEnabled: true,
      orderRunCacheActive: orderRunActiveEnabled && orderRunCachedPacketCount > 0,
      orderRunCacheActiveReason: orderRunActiveReason,
      orderRunRenderTextureCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureCount : 0,
      orderRunRenderTextureHitCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureHitCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureHitCount : 0,
      orderRunRenderTextureMissCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureMissCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureMissCount : 0,
      orderRunRenderTextureHitRate: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureHitRate != null ? orderRunRenderTextureSummary.orderRunRenderTextureHitRate : 0,
      orderRunRenderTextureCachedPacketCount: orderRunCachedPacketCount,
      orderRunRenderTextureGraphicsPacketCount: Array.isArray(playerSensitiveGraphicsItems) ? playerSensitiveGraphicsItems.length : 0,
      orderRunGraphicsItemsReboundToCurrentFrame: !!(orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunGraphicsItemsReboundToCurrentFrame === true),
      orderRunGraphicsItemsReboundCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunGraphicsItemsReboundCount != null ? orderRunRenderTextureSummary.orderRunGraphicsItemsReboundCount : 0,
      orderRunGraphicsItemsRebindMissingCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunGraphicsItemsRebindMissingCount != null ? orderRunRenderTextureSummary.orderRunGraphicsItemsRebindMissingCount : 0,
      orderRunRenderTextureRebuildPacketCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureRebuildPacketCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureRebuildPacketCount : 0,
      orderRunRenderTextureReusablePacketCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureReusablePacketCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureReusablePacketCount : 0,
      orderRunRenderTextureWallMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureWallMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureWallMs : 0,
      orderRunPlanBuildCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunPlanBuildCount != null ? orderRunRenderTextureSummary.orderRunPlanBuildCount : 0,
      orderRunPlanReuseCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunPlanReuseCount != null ? orderRunRenderTextureSummary.orderRunPlanReuseCount : 0,
      orderRunPlanCacheHitRate: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunPlanCacheHitRate != null ? orderRunRenderTextureSummary.orderRunPlanCacheHitRate : 0,
      orderRunPlanBuildMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunPlanBuildMs != null ? orderRunRenderTextureSummary.orderRunPlanBuildMs : 0,
      orderRunPlanRebuildReason: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunPlanRebuildReason ? String(orderRunRenderTextureSummary.orderRunPlanRebuildReason) : '',
      orderRunRenderTextureCreateCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCreateCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureCreateCount : 0,
      orderRunRenderTextureReuseCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureReuseCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureReuseCount : 0,
      orderRunRenderTextureDestroyCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureDestroyCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureDestroyCount : 0,
      orderRunRenderTextureUploadCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureUploadCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureUploadCount : 0,
      orderRunRenderTextureSignatureBuildMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureSignatureBuildMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureSignatureBuildMs : 0,
      orderRunRenderTextureCacheLookupMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCacheLookupMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureCacheLookupMs : 0,
      orderRunRenderTextureTextureCreateMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureTextureCreateMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureTextureCreateMs : 0,
      orderRunRenderTextureGraphicsCreateMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureGraphicsCreateMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureGraphicsCreateMs : 0,
      orderRunRenderTextureCommandDrawMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCommandDrawMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureCommandDrawMs : 0,
      orderRunRenderTextureRenderToTextureMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureRenderToTextureMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureRenderToTextureMs : 0,
      orderRunRenderTextureTextureDestroyMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureTextureDestroyMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureTextureDestroyMs : 0,
      orderRunRenderTextureSpriteApplyMs: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureSpriteApplyMs != null ? orderRunRenderTextureSummary.orderRunRenderTextureSpriteApplyMs : 0,
      staticPacketItemBuildCount: evidenceStaticPacketItemBuildCount,
      staticPacketItemReuseCount: evidenceStaticPacketItemReuseCount,
      staticChunkItemPlanCacheEnabled: chunkLevelPlanCacheEnabled === true,
      staticChunkItemPlanCacheHitCount: chunkLevelPlanCacheHitCount,
      staticChunkItemPlanCacheMissCount: chunkLevelPlanCacheMissCount,
      staticChunkItemPlanCacheHitRate: chunkLevelPlanCacheHitRate,
      staticChunkItemPlanCacheHitPacketCount: chunkLevelPlanCacheHitPacketCount,
      staticChunkItemPlanCacheMissPacketCount: chunkLevelPlanCacheMissPacketCount,
      staticChunkItemPlanCacheBuiltPacketCount: chunkLevelPlanCacheBuiltPacketCount,
      staticChunkItemPlanCacheLookupMs: Number(toNumber(chunkLevelPlanCacheLookupMs, 0).toFixed(3)),
      staticChunkItemPlanCacheMaterializeMs: Number(toNumber(phaseDiag.staticChunkItemPlanCacheMaterializeMs, 0).toFixed(3)),
      staticChunkItemPlanCacheSize: chunkLevelPlanCacheSize,
      staticChunkItemPlanCachePrunedCount: chunkLevelPlanCachePrunedCount,
      staticPacketItemCacheHitRate: evidenceStaticPacketItemCacheHitRate,
      staticPacketItemBaseCacheSize: evidenceStaticPacketItemCacheSize,
      staticPacketItemBaseCachePrunedCount: evidenceStaticPacketItemCachePrunedCount,
      staticPacketItemBaseCachePruneSkipped: pruneResult.skipped === true,
      staticPacketItemBaseCachePruneReason: pruneResult.reason || '',
      staticPacketItemBaseCacheActiveKeyCount: pruneResult.activeKeyCount != null ? pruneResult.activeKeyCount : null,
      staticPacketItemBaseCacheKeyCount: pruneResult.cacheKeyCount != null ? pruneResult.cacheKeyCount : null,
      staticPacketItemBaseCacheConfiguredLimit: pruneResult.limit != null ? pruneResult.limit : null,
      staticPacketItemBaseCacheEffectiveLimit: pruneResult.effectiveLimit != null ? pruneResult.effectiveLimit : null,
      staticPacketItemBaseCachePruneMs: Number(pruneStaticPacketItemBaseCacheMs.toFixed(3)),
      staticPacketItemBuildMs: Number(evidenceStaticPacketItemBuildMs.toFixed(3)),
      staticPacketProjectionLookupMs: Number(evidenceProjectionLookupMs.toFixed(3)),
      staticPacketSignatureBuildCount: evidencePacketSignatureBuildCount,
      staticPacketSignatureBuildMs: Number(evidencePacketSignatureBuildMs.toFixed(3)),
      staticPacketChunkSignatureBuildCount: evidencePacketChunkSignatureBuildCount,
      staticPacketChunkSignatureBuildMs: Number(evidencePacketChunkSignatureBuildMs.toFixed(3)),
      staticPacketDrawDataLookupMs: Number(evidenceDrawDataLookupMs.toFixed(3)),
      staticPacketDrawDataBuildCount: chunkDrawDataCacheMissCount,
      staticPacketDrawDataReuseCount: chunkDrawDataCacheHitCount,
      chunkEligibilitySplitMs: Number(evidenceChunkEligibilitySplitMs.toFixed(3)),
      chunkEligibilitySplitCacheEnabled: true,
      chunkEligibilitySplitCacheHit: evidenceChunkEligibilitySplitCacheHit === true,
      chunkEligibilitySplitBuildCount: evidenceChunkEligibilitySplitBuildCount,
      chunkEligibilitySplitReuseCount: evidenceChunkEligibilitySplitReuseCount,
      chunkEligibilitySplitCacheHitRate: evidenceChunkEligibilitySplitCacheHitRate,
      chunkEligibilitySplitRebuildReason: evidenceChunkEligibilitySplitRebuildReason,
      chunkEligibilitySplitMaterializeMs: Number(evidenceChunkEligibilitySplitMaterializeMs.toFixed(3)),
      chunkEligibilitySplitComputeMs: Number(evidenceChunkEligibilitySplitComputeMs.toFixed(3)),
      chunkEligibilitySplitCacheSize: evidenceChunkEligibilitySplitCacheSize,
      chunkEligibilitySplitCachePrunedCount: evidenceChunkEligibilitySplitCachePrunedCount,
      orderRunDiagnosticsBuildMs: Number(evidenceOrderRunDiagnosticsBuildMs.toFixed(3)),
      playerSensitiveGraphicsDrawMs: Number(evidencePlayerSensitiveDrawMs.toFixed(3)),
      containerSortMs: Number(evidenceContainerSortMs.toFixed(3)),
      actualChunkCacheSpriteDrawCount: chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? chunkRenderTextureSummary.chunkRenderTextureCount : 0,
      actualOrderRunCacheSpriteDrawCount: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureCount : 0,
      actualCacheSpriteDrawCount: (chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? chunkRenderTextureSummary.chunkRenderTextureCount : 0) + (orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureCount : 0),
      actualGraphicsPacketDrawCount: playerSensitiveDraw && playerSensitiveDraw.packetDrawCount != null ? playerSensitiveDraw.packetDrawCount : 0,
      actualDrawUnitCount: (chunkRenderTextureSummary && chunkRenderTextureSummary.chunkRenderTextureCount != null ? chunkRenderTextureSummary.chunkRenderTextureCount : 0) + (orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCount != null ? orderRunRenderTextureSummary.orderRunRenderTextureCount : 0) + (playerSensitiveDraw && playerSensitiveDraw.packetDrawCount != null ? playerSensitiveDraw.packetDrawCount : 0),
      playerChunkDebugOverlayEnabled: playerChunkDebugOverlaySummary && playerChunkDebugOverlaySummary.overlayEnabled === true,
      playerChunkDebugOverlayActiveChunkVisibleChunkSpritePoolCount: playerChunkDebugOverlaySummary && playerChunkDebugOverlaySummary.activeChunkVisibleChunkSpritePoolCount != null ? playerChunkDebugOverlaySummary.activeChunkVisibleChunkSpritePoolCount : null,
      playerChunkDebugOverlayActualGraphicsVisibleCount: playerChunkDebugOverlaySummary && playerChunkDebugOverlaySummary.actualGraphicsVisibleCount != null ? playerChunkDebugOverlaySummary.actualGraphicsVisibleCount : null,
      orderRunRenderTextureTransformOnlySprites: !!(orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureTransformOnlySprites === true),
      orderRunRenderTextureCacheSpace: orderRunRenderTextureSummary && orderRunRenderTextureSummary.orderRunRenderTextureCacheSpace ? String(orderRunRenderTextureSummary.orderRunRenderTextureCacheSpace) : '',
      orderRunCacheEligibleForActive: !!(orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.eligibleForActiveOrderRunCache === true),
      orderRunCacheOrderInversionRiskCount: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.orderInversionRiskCount != null ? orderRunCacheDiagnosticsSummary.orderInversionRiskCount : 0,
      orderRunCachePlayerSensitiveOrderRunCount: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCount != null ? orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCount : 0,
      orderRunCachePlayerSensitiveOrderRunCacheableCount: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCacheableCount != null ? orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCacheableCount : 0,
      orderRunCachePlayerSensitiveOrderRunCacheablePacketCount: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCacheablePacketCount != null ? orderRunCacheDiagnosticsSummary.playerSensitiveOrderRunCacheablePacketCount : 0,
      orderRunCacheEstimatedDrawUnitReductionIfCacheAllRuns: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionIfCacheAllRuns != null ? orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionIfCacheAllRuns : 0,
      orderRunCacheEstimatedDrawUnitReductionRateIfCacheAllRuns: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionRateIfCacheAllRuns != null ? orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionRateIfCacheAllRuns : 0,
      orderRunCacheEstimatedDrawUnitReductionIfCacheBeneficialRuns: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionIfCacheBeneficialRuns != null ? orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionIfCacheBeneficialRuns : 0,
      orderRunCacheEstimatedDrawUnitReductionRateIfCacheBeneficialRuns: orderRunCacheDiagnosticsSummary && orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionRateIfCacheBeneficialRuns != null ? orderRunCacheDiagnosticsSummary.estimatedDrawUnitReductionRateIfCacheBeneficialRuns : 0,
      persistentGraphicsReuseEnabled: true,
      staticGpuChunkCacheInputEnabled: !!(chunkInputSummary && chunkInputSummary.ok === true),
      staticGpuChunkCacheDiagnosticOnly: true,
      staticGpuChunkCacheDiagnosticSuppressedInPerformanceMode: chunkInputDiagnosticsSuppressed === true,
      staticChunkDrawDataCacheHitCount: chunkDrawDataCacheHitCount,
      staticChunkDrawDataCacheMissCount: chunkDrawDataCacheMissCount,
      staticChunkDrawDataCacheHitRate: (chunkDrawDataCacheHitCount + chunkDrawDataCacheMissCount) ? Number((chunkDrawDataCacheHitCount / (chunkDrawDataCacheHitCount + chunkDrawDataCacheMissCount)).toFixed(4)) : 0,
      staticGpuChunkCount: chunkInputSummary && chunkInputSummary.chunkCount != null ? chunkInputSummary.chunkCount : null,
      staticGpuChunkCacheHitCount: chunkInputSummary && chunkInputSummary.chunkCacheHitCount != null ? chunkInputSummary.chunkCacheHitCount : null,
      staticGpuChunkCacheMissCount: chunkInputSummary && chunkInputSummary.chunkCacheMissCount != null ? chunkInputSummary.chunkCacheMissCount : null,
      staticGpuChunkCacheHitRate: chunkInputSummary && chunkInputSummary.chunkCacheHitRate != null ? chunkInputSummary.chunkCacheHitRate : null,
      staticGpuChunkReusablePacketCount: chunkInputSummary && chunkInputSummary.chunkReusablePacketCount != null ? chunkInputSummary.chunkReusablePacketCount : null,
      staticGpuChunkRebuildCandidatePacketCount: chunkInputSummary && chunkInputSummary.chunkRebuildCandidatePacketCount != null ? chunkInputSummary.chunkRebuildCandidatePacketCount : null,
      staticGpuChunkLargestPacketCount: chunkInputSummary && chunkInputSummary.largestChunkPacketCount != null ? chunkInputSummary.largestChunkPacketCount : null,
      staticGpuChunkAvgPacketsPerChunk: chunkInputSummary && chunkInputSummary.avgPacketsPerChunk != null ? chunkInputSummary.avgPacketsPerChunk : null,
      staticGraphicsReusedCount: persistentGraphicsReuseCount,
      staticGraphicsRebuiltCount: persistentGraphicsRebuildCount,
      staticGraphicsReuseRate: packetDrawCount ? Number((persistentGraphicsReuseCount / packetDrawCount).toFixed(4)) : 0,
      staticGraphicsCpuBuildAvoidedCount: persistentGraphicsReuseCount,
      projectedGeometryCacheHitCount: projectedGeometryHitCount,
      projectedGeometryCacheMissCount: projectedGeometryMissCount,
      polygonDrawCount: polygonDrawCount,
      overlayDrawCount: overlayDrawCount,
      terrainBoundaryDrawCount: terrainBoundaryDrawCount,
      drawWallMs: Number(wallMs.toFixed ? wallMs.toFixed(3) : wallMs),
      staticUsesSharedFloorReuseTransform: !!(renderTransform && renderTransform.active === true),
      staticUsesSharedRenderFrameSnapshot: !!getSharedRenderFrameSnapshot(),
      staticSharedRenderFrameSurfaceRevision: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorSharedSurfaceRevision : null,
      staticSharedRenderFrameTextureVersion: getStaticSharedFrameTextureVersionForCache(viewRotation),
      staticSharedRenderFrameTextureVersionRaw: getSharedRenderFrameSnapshot() ? getSharedRenderFrameSnapshot().floorTextureVersion : '',
      visualViewRotation: staticRotationDiagnostics.visualViewRotation,
      staticCacheViewRotation: staticRotationDiagnostics.staticCacheViewRotation,
      staticCacheViewRotationMode: staticRotationDiagnostics.staticCacheViewRotationMode,
      staticCacheViewRotationDelta: staticRotationDiagnostics.staticCacheViewRotationDelta,
      staticCacheRotationWasFractional: staticRotationDiagnostics.staticCacheRotationWasFractional === true,
      fractionalRotationInStaticCacheKey: staticRotationDiagnostics.fractionalRotationInStaticCacheKey === true,
      staticSharedFloorReuseReason: renderTransform && renderTransform.reason ? String(renderTransform.reason) : '',
      staticSharedFloorReuseScale: renderTransform && renderTransform.active ? renderTransform.scale : null,
      staticSharedFloorReuseSpriteX: renderTransform && renderTransform.active ? renderTransform.spriteX : null,
      staticSharedFloorReuseSpriteY: renderTransform && renderTransform.active ? renderTransform.spriteY : null,
      staticSharedFloorReuseBuildCameraX: renderTransform && renderTransform.active ? renderTransform.floorBuildCameraX : null,
      staticSharedFloorReuseBuildCameraY: renderTransform && renderTransform.active ? renderTransform.floorBuildCameraY : null,
      staticSharedFloorReuseBuildZoom: renderTransform && renderTransform.active ? renderTransform.floorBuildZoom : null,
      staticZoomDelegateWouldHaveFallenBack: !!(zoomDelegate && zoomDelegate.delegate === true),
      staticZoomDelegateFallbackReason: zoomDelegate && zoomDelegate.reason ? String(zoomDelegate.reason) : '',
      staticFloorAlignmentProbeOk: alignmentProbe && alignmentProbe.ok === true,
      staticFloorAlignmentProbeReason: alignmentProbe && alignmentProbe.reason ? alignmentProbe.reason : '',
      staticFloorAlignmentMaxAbsError: alignmentProbe && alignmentProbe.maxAbsError != null ? alignmentProbe.maxAbsError : null,
      staticFloorAlignmentDx: alignmentProbe && alignmentProbe.dx != null ? alignmentProbe.dx : null,
      staticFloorAlignmentDy: alignmentProbe && alignmentProbe.dy != null ? alignmentProbe.dy : null,
      staticFloorAlignmentPacketId: alignmentProbe && alignmentProbe.packetId ? alignmentProbe.packetId : '',
      staticFloorAlignmentFaceMergeMode: alignmentProbe && alignmentProbe.effectiveFaceMergeMode ? alignmentProbe.effectiveFaceMergeMode : '',
      staticFloorAlignmentFloorReuseScale: alignmentProbe && alignmentProbe.floorReuseScale != null ? alignmentProbe.floorReuseScale : null,
      staticFloorAlignmentFloorReuseDx: alignmentProbe && alignmentProbe.floorReuseDx != null ? alignmentProbe.floorReuseDx : null,
      staticFloorAlignmentFloorReuseDy: alignmentProbe && alignmentProbe.floorReuseDy != null ? alignmentProbe.floorReuseDy : null,
      staticFloorAlignmentFloorTransformShouldReuse: alignmentProbe && alignmentProbe.floorTransformShouldReuse === true,
      staticFloorAlignmentFloorTransformScaled: alignmentProbe && alignmentProbe.floorTransformScaled === true,
      staticProjectionCameraX: alignmentProbe && alignmentProbe.currentCameraX != null ? alignmentProbe.currentCameraX : null,
      staticProjectionCameraY: alignmentProbe && alignmentProbe.currentCameraY != null ? alignmentProbe.currentCameraY : null,
      staticProjectionCurrentZoom: alignmentProbe && alignmentProbe.currentZoom != null ? alignmentProbe.currentZoom : null,
      floorBuildCameraXAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildCameraX != null ? alignmentProbe.floorBuildCameraX : null,
      floorBuildCameraYAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildCameraY != null ? alignmentProbe.floorBuildCameraY : null,
      floorBuildZoomAtStaticProjection: alignmentProbe && alignmentProbe.floorBuildZoom != null ? alignmentProbe.floorBuildZoom : null,
      diagnosticOnlyFinalCompositionProbeCompatible: true,
      unsafeStaticInputPlanCacheEnabled: false,
      unsafeStaticInputPlanCacheRemoved: true,
      staticInputPlanCachePolicy: 'exact-order-fast-hit-plus-content-set-fallback-reusing-existing-staticPacketItemBaseCache',
      staticMaterializedPlanCachePolicy: 'exact-order fast-hit + content-set fallback; reuses existing base cache; no renderTransform/sprite-placement cached',
      staticStableItemPlanCacheGate: phaseDiag.staticStableItemPlanCacheGate || '',
      staticStableItemPlanCacheBlockedBy: phaseDiag.staticStableItemPlanCacheBlockedBy || '',
      staticStableItemPlanCacheGateMode: phaseDiag.staticStableItemPlanCacheGateMode || '',
      pixiPerformanceModeEnabled: phaseDiag.pixiPerformanceModeEnabled === true,
      verboseStaticDiagnosticsEnabled: phaseDiag.verboseStaticDiagnosticsEnabled === true,
      chunkInputDiagnosticsSuppressedForStablePlan: phaseDiag.chunkInputDiagnosticsSuppressedForStablePlan === true,
      stableItemPlanCacheRequiresPerformanceMode: phaseDiag.stableItemPlanCacheRequiresPerformanceMode === true,
      staticMaterializedPlanCacheEnabled: phaseDiag.staticMaterializedPlanCacheEnabled === true,
      staticMaterializedPlanCacheHit: phaseDiag.staticMaterializedPlanCacheHit === true,
      staticMaterializedPlanExactCacheHit: phaseDiag.staticMaterializedPlanExactCacheHit === true,
      staticStableItemPlanContentSetHit: phaseDiag.staticStableItemPlanContentSetHit === true,
      staticStableItemPlanContentSetReason: phaseDiag.staticStableItemPlanContentSetReason || '',
      staticStableItemPlanContentSetKeyHash: phaseDiag.staticStableItemPlanContentSetKeyHash || '',
      staticMaterializedPlanCacheReason: phaseDiag.staticMaterializedPlanCacheReason || '',
      staticMaterializedPlanCacheSize: phaseDiag.staticMaterializedPlanCacheSize || 0,
      staticMaterializedContentSetCacheSize: phaseDiag.staticMaterializedContentSetCacheSize || 0,
      staticStableItemPlanFastHitEnabled: phaseDiag.staticStableItemPlanFastHitEnabled === true,
      staticStableItemPlanFastHit: phaseDiag.staticStableItemPlanFastHit === true,
      staticStableItemPlanFastHitReason: phaseDiag.staticStableItemPlanFastHitReason || '',
      staticStableItemPlanFastItemCount: phaseDiag.staticStableItemPlanFastItemCount || 0,
      staticStableItemPlanFastSplitHit: phaseDiag.staticStableItemPlanFastSplitHit === true,
      stablePlanKeyDiffEnabled: phaseDiag.stablePlanKeyDiffEnabled === true,
      stablePlanKeyDiffReason: phaseDiag.stablePlanKeyDiffReason || '',
      stablePlanKeyMissComparedTo: phaseDiag.stablePlanKeyMissComparedTo || '',
      stablePlanKeyDiffFieldCount: phaseDiag.stablePlanKeyDiffFieldCount || 0,
      stablePlanKeyDiffFields: phaseDiag.stablePlanKeyDiffFields || '',
      stablePlanKeyDiffTop: phaseDiag.stablePlanKeyDiffTop || '',
      stablePlanKeyChangedFromPrevious: phaseDiag.stablePlanKeyChangedFromPrevious === true,
      stablePlanKeyNearestCacheHit: phaseDiag.stablePlanKeyNearestCacheHit === true,
      stablePlanKeyNearestCacheDiffFieldCount: phaseDiag.stablePlanKeyNearestCacheDiffFieldCount || 0,
      stablePlanKeyNearestCacheDiffTop: phaseDiag.stablePlanKeyNearestCacheDiffTop || '',
      stablePlanKeyCurrentHash: phaseDiag.stablePlanKeyCurrentHash || '',
      stablePlanKeyPreviousHash: phaseDiag.stablePlanKeyPreviousHash || '',
      stablePlanKeyNearestCacheHash: phaseDiag.stablePlanKeyNearestCacheHash || '',
      stablePlanKeyCurrentContentHash: phaseDiag.stablePlanKeyCurrentContentHash || '',
      stablePlanKeyPreviousContentHash: phaseDiag.stablePlanKeyPreviousContentHash || '',
      stablePlanKeyContentHashChanged: phaseDiag.stablePlanKeyContentHashChanged === true,
      stablePlanKeyRunsHashChanged: phaseDiag.stablePlanKeyRunsHashChanged === true,
      stablePlanKeyStaticSharedTexVerChanged: phaseDiag.stablePlanKeyStaticSharedTexVerChanged === true,
      stablePlanKeyFloorBuildCameraChanged: phaseDiag.stablePlanKeyFloorBuildCameraChanged === true,
      stablePlanKeyFloorSurfaceRevisionChanged: phaseDiag.stablePlanKeyFloorSurfaceRevisionChanged === true,
      stablePlanKeyFaceMergeChanged: phaseDiag.stablePlanKeyFaceMergeChanged === true,
      stablePlanKeyCurrentCameraChanged: phaseDiag.stablePlanKeyCurrentCameraChanged === true,
      safeInputPlanAuditSummary: safeInputPlanAuditSummary || null,
      safeInputPlanFrameDependentFieldsNotCached: safeInputPlanAuditSummary && safeInputPlanAuditSummary.frameDependentFieldsNotCached ? safeInputPlanAuditSummary.frameDependentFieldsNotCached.join(',') : '',
      safeInputPlanStableFieldsAllowedForFutureCache: safeInputPlanAuditSummary && safeInputPlanAuditSummary.stableFieldsAllowedForFutureCache ? safeInputPlanAuditSummary.stableFieldsAllowedForFutureCache.join(',') : '',
      source: meta && meta.source || 'beginFrame'
    };
    if (optimizationPlacementAuditSummary) {
      state.lastSummary.optimizationPlacementAuditSummary = optimizationPlacementAuditSummary;
      state.lastSummary.optimizationAuditVisibleChunkCount = optimizationPlacementAuditSummary.visibleChunkCount || 0;
      state.lastSummary.optimizationAuditVisibleStaticPacketCount = optimizationPlacementAuditSummary.visibleStaticPacketCount || 0;
      state.lastSummary.optimizationAuditChunkKeyOnlyGroupCount = optimizationPlacementAuditSummary.chunkKeyOnlyGroupCount || 0;
      state.lastSummary.optimizationAuditStableDepthBandGroupCount = optimizationPlacementAuditSummary.stableDepthBandGroupCount || 0;
      state.lastSummary.optimizationAuditStableDepthBandFragmentationFactor = optimizationPlacementAuditSummary.stableDepthBandFragmentationFactor || 0;
      state.lastSummary.optimizationAuditActualStaticDrawUnitCount = optimizationPlacementAuditSummary.actualStaticDrawUnitCount || 0;
      state.lastSummary.optimizationAuditEstimatedExcessChunkSpritesFromBanding = optimizationPlacementAuditSummary.estimatedExcessChunkSpritesFromBanding || 0;
      state.lastSummary.optimizationAuditVerdict = optimizationPlacementAuditSummary.auditVerdict || '';
      emit('optimization-placement-audit', optimizationPlacementAuditSummary);
    }
    if (safeInputPlanAuditSummary) {
      state.lastSummary.safeInputPlanAuditSummary = safeInputPlanAuditSummary;
      state.lastSummary.unsafeStaticInputPlanCacheEnabled = false;
      state.lastSummary.unsafeStaticInputPlanCacheRemoved = true;
      state.lastSummary.safeInputPlanPolicy = safeInputPlanAuditSummary.staticInputPlanCachePolicy || 'disabled-until-safe-stable-plan-cache';
      emit('safe-input-plan-audit', safeInputPlanAuditSummary);
    }
    emitOrderRunCacheEvidence({
      frameSeq: state.lastSummary.frameSeq,
      framePlanId: state.lastSummary.framePlanId,
      playerLocalFaceDemergeChunkKey: state.lastSummary.playerLocalFaceDemergeChunkKey,
      staticPacketCount: state.lastSummary.staticPacketCount,
      playerSensitivePacketCount: state.lastSummary.chunkRenderTexturePlayerSensitivePacketCount,
      orderRunCacheActive: state.lastSummary.orderRunCacheActive,
      orderRunCacheActiveReason: state.lastSummary.orderRunCacheActiveReason,
      orderRunPlanBuildCount: state.lastSummary.orderRunPlanBuildCount,
      orderRunPlanReuseCount: state.lastSummary.orderRunPlanReuseCount,
      orderRunPlanCacheHitRate: state.lastSummary.orderRunPlanCacheHitRate,
      orderRunPlanBuildMs: state.lastSummary.orderRunPlanBuildMs,
      orderRunPlanRebuildReason: state.lastSummary.orderRunPlanRebuildReason,
      orderRunRenderTextureCount: state.lastSummary.orderRunRenderTextureCount,
      orderRunRenderTextureHitCount: state.lastSummary.orderRunRenderTextureHitCount,
      orderRunRenderTextureMissCount: state.lastSummary.orderRunRenderTextureMissCount,
      orderRunRenderTextureHitRate: state.lastSummary.orderRunRenderTextureHitRate,
      orderRunRenderTextureCreateCount: state.lastSummary.orderRunRenderTextureCreateCount,
      orderRunRenderTextureReuseCount: state.lastSummary.orderRunRenderTextureReuseCount,
      orderRunRenderTextureDestroyCount: state.lastSummary.orderRunRenderTextureDestroyCount,
      orderRunRenderTextureUploadCount: state.lastSummary.orderRunRenderTextureUploadCount,
      orderRunRenderTextureRebuildPacketCount: state.lastSummary.orderRunRenderTextureRebuildPacketCount,
      orderRunRenderTextureReusablePacketCount: state.lastSummary.orderRunRenderTextureReusablePacketCount,
      orderRunRenderTextureSignatureBuildMs: state.lastSummary.orderRunRenderTextureSignatureBuildMs,
      orderRunRenderTextureCacheLookupMs: state.lastSummary.orderRunRenderTextureCacheLookupMs,
      orderRunRenderTextureTextureCreateMs: state.lastSummary.orderRunRenderTextureTextureCreateMs,
      orderRunRenderTextureGraphicsCreateMs: state.lastSummary.orderRunRenderTextureGraphicsCreateMs,
      orderRunRenderTextureCommandDrawMs: state.lastSummary.orderRunRenderTextureCommandDrawMs,
      orderRunRenderTextureRenderToTextureMs: state.lastSummary.orderRunRenderTextureRenderToTextureMs,
      orderRunRenderTextureTextureDestroyMs: state.lastSummary.orderRunRenderTextureTextureDestroyMs,
      orderRunRenderTextureSpriteApplyMs: state.lastSummary.orderRunRenderTextureSpriteApplyMs,
      orderRunRenderTextureWallMs: state.lastSummary.orderRunRenderTextureWallMs,
      staticPacketItemBuildCount: state.lastSummary.staticPacketItemBuildCount,
      staticPacketItemReuseCount: state.lastSummary.staticPacketItemReuseCount,
      staticPacketItemCacheHitRate: state.lastSummary.staticPacketItemCacheHitRate,
      staticPacketItemBaseCacheSize: state.lastSummary.staticPacketItemBaseCacheSize,
      staticPacketItemBaseCachePrunedCount: state.lastSummary.staticPacketItemBaseCachePrunedCount,
      staticPacketItemBaseCachePruneSkipped: state.lastSummary.staticPacketItemBaseCachePruneSkipped,
      staticPacketItemBaseCachePruneReason: state.lastSummary.staticPacketItemBaseCachePruneReason,
      staticPacketItemBaseCacheActiveKeyCount: state.lastSummary.staticPacketItemBaseCacheActiveKeyCount,
      staticPacketItemBaseCacheKeyCount: state.lastSummary.staticPacketItemBaseCacheKeyCount,
      staticPacketItemBaseCacheConfiguredLimit: state.lastSummary.staticPacketItemBaseCacheConfiguredLimit,
      staticPacketItemBaseCacheEffectiveLimit: state.lastSummary.staticPacketItemBaseCacheEffectiveLimit,
      staticPacketItemBaseCachePruneMs: state.lastSummary.staticPacketItemBaseCachePruneMs,
      staticPacketItemBuildMs: state.lastSummary.staticPacketItemBuildMs,
      staticPacketProjectionLookupMs: state.lastSummary.staticPacketProjectionLookupMs,
      projectedGeometryCacheHitCount: state.lastSummary.projectedGeometryCacheHitCount,
      projectedGeometryCacheMissCount: state.lastSummary.projectedGeometryCacheMissCount,
      staticPacketSignatureBuildCount: state.lastSummary.staticPacketSignatureBuildCount,
      staticPacketSignatureBuildMs: state.lastSummary.staticPacketSignatureBuildMs,
      staticPacketChunkSignatureBuildCount: state.lastSummary.staticPacketChunkSignatureBuildCount,
      staticPacketChunkSignatureBuildMs: state.lastSummary.staticPacketChunkSignatureBuildMs,
      staticPacketDrawDataBuildCount: state.lastSummary.staticPacketDrawDataBuildCount,
      staticPacketDrawDataReuseCount: state.lastSummary.staticPacketDrawDataReuseCount,
      staticPacketDrawDataCacheHitRate: state.lastSummary.staticChunkDrawDataCacheHitRate,
      staticPacketDrawDataLookupMs: state.lastSummary.staticPacketDrawDataLookupMs,
      chunkEligibilitySplitMs: state.lastSummary.chunkEligibilitySplitMs,
      orderRunDiagnosticsBuildMs: state.lastSummary.orderRunDiagnosticsBuildMs,
      playerSensitiveGraphicsDrawMs: state.lastSummary.playerSensitiveGraphicsDrawMs,
      containerSortMs: state.lastSummary.containerSortMs,
      actualChunkCacheSpriteDrawCount: state.lastSummary.actualChunkCacheSpriteDrawCount,
      actualOrderRunCacheSpriteDrawCount: state.lastSummary.actualOrderRunCacheSpriteDrawCount,
      actualCacheSpriteDrawCount: state.lastSummary.actualCacheSpriteDrawCount,
      actualGraphicsPacketDrawCount: state.lastSummary.actualGraphicsPacketDrawCount,
      actualDrawUnitCount: state.lastSummary.actualDrawUnitCount,
      polygonDrawCount: state.lastSummary.polygonDrawCount,
      chunkRenderTextureCreateCount: state.lastSummary.chunkRenderTextureCreateCount,
      chunkRenderTextureReuseCount: state.lastSummary.chunkRenderTextureReuseCount,
      chunkRenderTextureDestroyCount: state.lastSummary.chunkRenderTextureDestroyCount,
      chunkRenderTextureUploadCount: state.lastSummary.chunkRenderTextureUploadCount,
      chunkRenderTextureGroupBuildMs: state.lastSummary.chunkRenderTextureGroupBuildMs,
      chunkRenderTextureSignatureBuildMs: state.lastSummary.chunkRenderTextureSignatureBuildMs,
      chunkRenderTextureCommandDrawMs: state.lastSummary.chunkRenderTextureCommandDrawMs,
      chunkRenderTextureRenderToTextureMs: state.lastSummary.chunkRenderTextureRenderToTextureMs,
      chunkRenderTextureSpriteApplyMs: state.lastSummary.chunkRenderTextureSpriteApplyMs,
      drawWallMs: state.lastSummary.drawWallMs
    });
    phaseDiag.ok = true;
    phaseDiag.lastPhase = 'success-summary';
    phaseDiag.summaryBuildMs = Math.max(0, nowMs() - startAt - wallMs);
    publishBeginFramePhaseDiagnostics(phaseDiag, 'success', { ok: true }, wallMs >= 16);
    recordStaticWorldPerformanceAssessment(state.lastSummary, phaseDiag);
    emitStaticWorldForensics(state.lastSummary, phaseDiag, container);
    if (alignmentProbe) emit('static-floor-alignment-probe', alignmentProbe);
    emit('summary', state.lastSummary);
    return state.lastSummary;
  }

  function shouldSkipCanvas2dStaticRun(packets, meta, runStartIndex) {
    if (state.activeCategoryAdopted !== true) return false;
    var framePlanId = String(meta && meta.framePlanId || state.activeFramePlanId || 'frameplan:none');
    if (framePlanId !== state.activeFramePlanId) return false;
    return state.activeRunKeys[makeRunKey(framePlanId, runStartIndex)] === true;
  }

  function getLastSummary() {
    return state.lastSummary || null;
  }

  function getLastAssetClassificationSummary() {
    return state.lastAssetClassificationSummary || null;
  }

  function reset(reason) {
    clearActiveRunKeys();
    state.activeCategoryAdopted = false;
    state.activeFramePlanId = '';
    clearUnusedGraphics(0);
    clearUnusedChunkSprites(0);
    setContainerVisible(getPixiContainer(), false);
    state.lastSummary = {
      ok: true,
      renderer: 'pixi-static-world-packet-consumer',
      reset: true,
      reason: reason || 'reset',
      pixiDrawsStaticWorldPackets: false,
      canvas2dSkipsStaticWorldPackets: false
    };
    return state.lastSummary;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    step: STEP,
    beginFrame: beginFrame,
    shouldSkipCanvas2dStaticRun: shouldSkipCanvas2dStaticRun,
    getLastSummary: getLastSummary,
    getLastAssetClassificationSummary: getLastAssetClassificationSummary,
    getLastBeginFramePhaseDiagnostics: getLastBeginFramePhaseDiagnostics,
    getLastBeginFrameExceptionDiagnostics: getLastBeginFrameExceptionDiagnostics,
    reset: reset
  };

  global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_WORLD_PACKET_CONSUMER__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.pixiStaticWorldPacketConsumer', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
  global.App = global.App || {};
  global.App.renderer = global.App.renderer || {};
  global.App.renderer.optimization = global.App.renderer.optimization || {};
  global.App.renderer.optimization.pixiStaticWorldPacketConsumer = api;

  emit('ready', {
    ok: true,
    formalStaticWorldMigration: true,
    staticGpuChunkCacheInputPlan: true,
    staticChunkRenderTextureCache: true,
    staticChunkTransformOnlyCache: true,
    staticChunkDrawDataCache: true,
    assetRenderableClassificationDiagnostics: true,
    assetRenderableClassificationDiagnosticsOnly: false,
    orderRunRenderTextureCacheActive: true,
    orderRunCacheEvidenceDiagnostics: true,
    performanceModeSuppressesDiagnosticOnlyGpuChunkInput: true,
    consumesRendererNeutralPackets: true,
    consumesCanvas2dRasterOutput: false,
    source: 'module-load'
  });
})(typeof window !== 'undefined' ? window : globalThis);
