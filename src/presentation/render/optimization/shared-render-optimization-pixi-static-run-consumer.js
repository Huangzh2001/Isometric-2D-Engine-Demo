// PXM-07.8B: PixiJS static-packet-run shared consumer cache layer.
// Layer: presentation/render/optimization.
//
// This module lets PixiJS consume the renderer-neutral static-packet-run
// optimization source by creating/reusing PIXI textures from existing shared
// static run bitmap surfaces. It intentionally does not display those textures
// or skip Canvas2D static packet drawing yet, because static-world-face-packet
// runs are depth-interleaved with actors/objects through framePlan.order. Visual
// adoption must wait until the depth/order handoff is safe.
(function registerSharedRenderOptimizationPixiStaticRunConsumer(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-pixi-static-run-consumer.js';
  var PHASE = 'pixi-static-packet-run-shared-consumer-cache';
  var STEP = 'PXM-07.8B';
  var VISUAL_STEP = 'PXM-07.9A';
  var FULL_VISUAL_STEP = 'PXM-07.9B';
  var SEGMENTED_STEP = 'PXM-07.9C';
  var SINGLE_OWNER_STEP = 'PXM-07.9D';
  var GLITCH_DIAG_STEP = 'PXM-07.9E';
  var STABLE_ADOPTION_STEP = 'PXM-07.9F';
  var ZOOM_SEAM_GUARD_STEP = 'PXM-07.11B';
  var MODE = 'texture-cache-consumer-depth-aware-segmented-prefix-exclusive';
  var MAX_TEXTURES_PER_FRAME = 64;
  var MAX_VISUAL_RUNS = 64;
  var VISUAL_STALE_WINDOW_MS = 350;

  var state = {
    consumeSeq: 0,
    textureBySignature: Object.create(null),
    textureSignatureByKey: Object.create(null),
    visualSpriteByRunKey: Object.create(null),
    visualPlanByRunKey: Object.create(null),
    visualPlanFrameSeq: 0,
    activeVisualPlanRevision: 0,
    staleCanvas2dSkipBlockedCount: 0,
    orphanPixiStaticSpriteCount: 0,
    lastVisualSummary: null,
    retainedCommittedPlanCount: 0,
    spritePixelSnapCount: 0,
    lastSummary: null,
    totalTextureCreateCount: 0,
    totalTextureReuseCount: 0,
    totalTextureUpdateCount: 0,
    totalVisualAdoptedRunCount: 0,
    totalCanvas2dSkippedRunCount: 0,
    totalCandidateRunCount: 0,
    totalConsumedRunCount: 0
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getPixi() {
    try { return global.PIXI || null; } catch (_) { return null; }
  }

  function emitLegacyVisualDiagnostics(section, payload) {
    // PXM-07.9D disables the legacy PXM-07.9A/PXM-07.9B visual owners.
    // Keep this function as an inert compatibility seam so old diagnostics files can
    // remain loaded without receiving adoption or canvas2d-skip control events.
    return Object.assign({ section: section || 'event', legacyVisualOwnerDisabled: true }, payload || {});
  }

  function emitSingleOwnerDiagnostics(section, payload) {
    payload = Object.assign({ section: section || 'event' }, payload || {});
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SINGLE_OWNER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunSingleOwner === 'function') {
        diag.notePixiStaticRunSingleOwner(payload, { source: payload && payload.source || 'pixi-static-run-single-owner-cleanup' });
      }
    } catch (_) {}
  }

  function emitGlitchDiagnostics(section, payload) {
    payload = Object.assign({ section: section || 'event' }, payload || {});
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_GLITCH_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunGlitchProbe === 'function') {
        diag.notePixiStaticRunGlitchProbe(payload, { source: payload && payload.source || 'pixi-static-run-glitch-probe' });
      }
    } catch (_) {}
  }

  function emitStableAdoptionDiagnostics(section, payload) {
    payload = Object.assign({ section: section || 'event' }, payload || {});
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_STABLE_ADOPTION_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunStableAdoption === 'function') {
        diag.notePixiStaticRunStableAdoption(payload, { source: payload && payload.source || 'pixi-static-run-stable-adoption' });
      }
    } catch (_) {}
  }

  function emitZoomSeamGuardDiagnostics(section, payload) {
    payload = Object.assign({ section: section || 'event' }, payload || {});
    try {
      if (typeof global.pushLog === 'function') {
        var parts = [
          '[pixi-migration][step=' + ZOOM_SEAM_GUARD_STEP + '][' + String(section || 'event') + ']',
          'ok=' + (payload.ok === false ? 'false' : 'true'),
          'activeBackend=' + String(payload.activeBackend || getActiveBackend()),
          'zoomSeamGuard=' + (payload.zoomSeamGuard === true),
          'visualAdoptionSuppressedByZoom=' + (payload.visualAdoptionSuppressedByZoom === true),
          'zoomInteractionActive=' + (payload.zoomInteractionActive === true),
          'zoomSettlePending=' + (payload.zoomSettlePending === true),
          'visualStaticRunAdoption=' + (payload.visualStaticRunAdoption === true),
          'pixiDrawsStaticPacketRuns=' + (payload.pixiDrawsStaticPacketRuns === true),
          'canvas2dDrawsStaticDuringZoom=' + (payload.canvas2dDrawsStaticDuringZoom === true),
          'staticRunSplitDisabledDuringZoom=' + (payload.staticRunSplitDisabledDuringZoom === true),
          'fallbackReason=' + String(payload.fallbackReason || ''),
          'changesDepthSort=false',
          'changesPicking=false'
        ];
        global.pushLog(parts.join(' '));
      }
    } catch (_) {}
  }

  function listObjectKeys(obj) {
    try { return obj ? Object.keys(obj) : []; } catch (_) { return []; }
  }

  function computeRunKeyDiff(previousPlan, currentPlan) {
    var previousKeys = listObjectKeys(previousPlan);
    var currentKeys = listObjectKeys(currentPlan);
    var currentSet = Object.create(null);
    var previousSet = Object.create(null);
    var added = [];
    var removed = [];
    for (var i = 0; i < currentKeys.length; i++) currentSet[currentKeys[i]] = true;
    for (var j = 0; j < previousKeys.length; j++) previousSet[previousKeys[j]] = true;
    for (var a = 0; a < currentKeys.length; a++) if (!previousSet[currentKeys[a]] && added.length < 6) added.push(currentKeys[a]);
    for (var r = 0; r < previousKeys.length; r++) if (!currentSet[previousKeys[r]] && removed.length < 6) removed.push(previousKeys[r]);
    return {
      previousPlanRunKeyCount: previousKeys.length,
      currentPlanRunKeyCount: currentKeys.length,
      addedRunKeyCount: Math.max(0, currentKeys.length - previousKeys.length + removed.length),
      removedRunKeyCount: Math.max(0, previousKeys.length - currentKeys.length + added.length),
      addedRunKeySample: added,
      removedRunKeySample: removed
    };
  }

  function summarizeVisualSprite(item, entry, sprite, texture, camera, runKey, signature) {
    entry = entry || {};
    camera = camera || {};
    var width = Math.max(0, toNumber(entry.width, 0));
    var height = Math.max(0, toNumber(entry.height, 0));
    var spriteWidth = Math.max(0, toNumber(sprite && sprite.width, 0));
    var spriteHeight = Math.max(0, toNumber(sprite && sprite.height, 0));
    var textureWidth = toNumber(texture && texture.width, 0);
    var textureHeight = toNumber(texture && texture.height, 0);
    var thinSpriteCandidate = (spriteWidth >= 64 && spriteHeight > 0 && spriteHeight <= 4) || (width >= 64 && height > 0 && height <= 4);
    var extremeAspectRatio = (spriteHeight > 0 && spriteWidth / spriteHeight > 80) || (height > 0 && width / height > 80);
    return {
      runKey: String(runKey || ''),
      runStartIndex: toNumber(entry.runStartIndex, -1),
      packetCount: toNumber(entry.packetCount, 0),
      firstDynamicIndex: toNumber(entry.firstDynamicIndex, -1),
      minX: toNumber(entry.minX, 0),
      minY: toNumber(entry.minY, 0),
      width: width,
      height: height,
      spriteX: toNumber(sprite && sprite.x, 0),
      spriteY: toNumber(sprite && sprite.y, 0),
      spriteWidth: spriteWidth,
      spriteHeight: spriteHeight,
      cameraX: toNumber(camera.x, 0),
      cameraY: toNumber(camera.y, 0),
      textureWidth: textureWidth,
      textureHeight: textureHeight,
      textureMatchesEntrySize: textureWidth === width && textureHeight === height,
      signature: String(signature || ''),
      firstPacketId: String(entry.firstPacketId || ''),
      lastPacketId: String(entry.lastPacketId || ''),
      thinSpriteCandidate: thinSpriteCandidate,
      extremeAspectRatio: extremeAspectRatio,
      possibleHorizontalLineRisk: thinSpriteCandidate || extremeAspectRatio
    };
  }


  function emitSegmentedDiagnostics(section, payload) {
    payload = Object.assign({ section: section || 'event' }, payload || {});
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SEGMENTED_ADOPTION_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunSegmentedAdoption === 'function') {
        diag.notePixiStaticRunSegmentedAdoption(payload, { source: payload && payload.source || 'pixi-static-run-segmented-adoption' });
      }
    } catch (_) {}
  }

  function makeRunKeyFromEntry(item) {
    var entry = item && item.entry || {};
    return [
      'run',
      String(toNumber(entry.currentViewRotation, 0)),
      String(toNumber(entry.runStartIndex, -1)),
      String(toNumber(entry.packetCount, 0)),
      String(entry.firstPacketId || ''),
      String(entry.lastPacketId || '')
    ].join('|');
  }

  function makeRunKeyFromPackets(packets, meta, runStartIndex) {
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    return [
      'run',
      String(toNumber(meta.currentViewRotation, 0)),
      String(toNumber(runStartIndex, -1)),
      String(packets.length || 0),
      String(packets.length ? (packets[0] && packets[0].id || '') : ''),
      String(packets.length ? (packets[packets.length - 1] && packets[packets.length - 1].id || '') : '')
    ].join('|');
  }

  function isDepthSafePrefixEntry(item) {
    var entry = item && item.entry || {};
    var runStartIndex = toNumber(entry.runStartIndex, -1);
    var packetCount = toNumber(entry.packetCount, 0);
    var firstDynamicIndex = toNumber(entry.firstDynamicIndex, -1);
    if (runStartIndex !== 0) return false;
    if (!(packetCount >= 24)) return false;
    if (!(firstDynamicIndex >= packetCount)) return false;
    return true;
  }

  function isStaticRunEntryAdoptable(item) {
    var entry = item && item.entry || {};
    var runStartIndex = toNumber(entry.runStartIndex, -1);
    var packetCount = toNumber(entry.packetCount, 0);
    if (!(runStartIndex >= 0)) return false;
    if (!(packetCount >= 24)) return false;
    if (!entry.bitmap) return false;
    return true;
  }


  function classifyStaticRunSegment(item) {
    var entry = item && item.entry || {};
    var runStartIndex = toNumber(entry.runStartIndex, -1);
    var packetCount = toNumber(entry.packetCount, 0);
    var firstDynamicIndex = toNumber(entry.firstDynamicIndex, -1);
    var runEndExclusive = runStartIndex + packetCount;
    var isPrefixBeforeFirstDynamic = runStartIndex === 0 && packetCount >= 24 && (firstDynamicIndex < 0 || runEndExclusive <= firstDynamicIndex);
    var afterFirstDynamic = firstDynamicIndex >= 0 && runStartIndex >= firstDynamicIndex;
    var crossesFirstDynamic = firstDynamicIndex >= 0 && runStartIndex < firstDynamicIndex && runEndExclusive > firstDynamicIndex;
    var safeForCurrentPixiLayer = isPrefixBeforeFirstDynamic;
    var unsafeReason = '';
    if (!entry.bitmap) unsafeReason = 'missing-bitmap-surface';
    else if (packetCount < 24) unsafeReason = 'below-static-run-threshold';
    else if (crossesFirstDynamic) unsafeReason = 'crosses-first-dynamic-index';
    else if (afterFirstDynamic) unsafeReason = 'after-first-dynamic-requires-mixed-depth-compositing';
    else if (!isPrefixBeforeFirstDynamic) unsafeReason = 'not-prefix-before-first-dynamic';
    return {
      runStartIndex: runStartIndex,
      runEndExclusive: runEndExclusive,
      packetCount: packetCount,
      firstDynamicIndex: firstDynamicIndex,
      isPrefixBeforeFirstDynamic: isPrefixBeforeFirstDynamic,
      afterFirstDynamic: afterFirstDynamic,
      crossesFirstDynamic: crossesFirstDynamic,
      safeForCurrentPixiLayer: safeForCurrentPixiLayer,
      unsafeReason: safeForCurrentPixiLayer ? '' : unsafeReason,
      firstPacketId: String(entry.firstPacketId || ''),
      lastPacketId: String(entry.lastPacketId || '')
    };
  }

  function classifyStaticRunSegments(entries) {
    entries = Array.isArray(entries) ? entries : [];
    var result = {
      segmentCount: 0,
      prefixSafeSegmentCount: 0,
      unsafeAfterDynamicSegmentCount: 0,
      unsafeCrossDynamicSegmentCount: 0,
      missingBitmapSegmentCount: 0,
      adoptedSegmentCount: 0,
      nonAdoptedSegmentCount: 0,
      sampleSegments: []
    };
    for (var i = 0; i < entries.length; i++) {
      var segment = classifyStaticRunSegment(entries[i]);
      result.segmentCount += 1;
      if (segment.safeForCurrentPixiLayer) result.prefixSafeSegmentCount += 1;
      if (segment.afterFirstDynamic) result.unsafeAfterDynamicSegmentCount += 1;
      if (segment.crossesFirstDynamic) result.unsafeCrossDynamicSegmentCount += 1;
      if (segment.unsafeReason === 'missing-bitmap-surface') result.missingBitmapSegmentCount += 1;
      if (result.sampleSegments.length < 8) result.sampleSegments.push(segment);
    }
    result.nonAdoptedSegmentCount = Math.max(0, result.segmentCount - result.prefixSafeSegmentCount);
    return result;
  }

  function getVisualFreshEntries(entries) {
    entries = Array.isArray(entries) ? entries : [];
    var latest = 0;
    for (var i = 0; i < entries.length; i++) {
      latest = Math.max(latest, toNumber(entries[i] && entries[i].entry && entries[i].entry.lastUsedAt, 0));
    }
    var fresh = [];
    for (var j = 0; j < entries.length; j++) {
      var at = toNumber(entries[j] && entries[j].entry && entries[j].entry.lastUsedAt, 0);
      if (!latest || latest - at <= VISUAL_STALE_WINDOW_MS) fresh.push(entries[j]);
    }
    fresh.sort(function (a, b) {
      return toNumber(a && a.entry && a.entry.runStartIndex, 0) - toNumber(b && b.entry && b.entry.runStartIndex, 0);
    });
    return { entries: fresh, latestLastUsedAt: latest };
  }

  function clearContainer(container, keepByRunKey) {
    if (!container || !container.children) return 0;
    keepByRunKey = keepByRunKey || Object.create(null);
    var removedCount = 0;
    try {
      var children = container.children.slice();
      for (var i = 0; i < children.length; i++) {
        var child = children[i];
        var runKey = child && child.__pixiStaticRunKey || '';
        if (runKey && keepByRunKey[runKey]) continue;
        try { if (typeof container.removeChild === 'function') container.removeChild(child); } catch (_) {}
        try { if (runKey && state.visualSpriteByRunKey) delete state.visualSpriteByRunKey[runKey]; } catch (_) {}
        try { if (child && typeof child.destroy === 'function') child.destroy({ children: true, texture: false, baseTexture: false }); } catch (_) {}
        removedCount += 1;
      }
    } catch (_) {}
    state.orphanPixiStaticSpriteCount += removedCount;
    return removedCount;
  }

  function getBackendSnapshot() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') return selection.getSnapshot() || {};
    } catch (_) {}
    return {};
  }

  function isZoomSingleWorldOwnerActive() {
    try { return global.__PIXI_MIGRATION_ZOOM_SINGLE_WORLD_OWNER_ACTIVE__ === true; } catch (_) {}
    return false;
  }

  function getActiveBackend() {
    var snapshot = getBackendSnapshot();
    if (snapshot && snapshot.activeBackend) return String(snapshot.activeBackend);
    return 'unknown';
  }

  function getLastSourceSnapshot() {
    try {
      var diag = global.__PIXI_MIGRATION_SHARED_OPTIMIZATION_SOURCE_LAYER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.getLastSharedSourceSnapshot === 'function') return diag.getLastSharedSourceSnapshot() || null;
    } catch (_) {}
    return null;
  }

  function getSourceRow(id) {
    var snapshot = getLastSourceSnapshot();
    var rows = snapshot && Array.isArray(snapshot.sources) ? snapshot.sources : [];
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].id === id) return rows[i];
    }
    return null;
  }

  function getCanvas2dAdapter() {
    try {
      var app = global.App && global.App.renderer ? global.App.renderer.canvas2d : null;
      if (app) return app;
    } catch (_) {}
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getRegisteredBackend === 'function') return selection.getRegisteredBackend('canvas2d') || null;
    } catch (_) {}
    return null;
  }

  function getStaticBitmapCacheEntries() {
    var adapter = getCanvas2dAdapter();
    var cache = adapter && adapter.__staticBitmapCache;
    if (!cache || typeof cache.forEach !== 'function') return [];
    var entries = [];
    try {
      cache.forEach(function (entry, key) {
        if (!entry || !entry.bitmap) return;
        entries.push({ key: String(key || entry.signature || ''), entry: entry });
      });
    } catch (_) {}
    entries.sort(function (a, b) {
      return toNumber(b.entry && b.entry.lastUsedAt, 0) - toNumber(a.entry && a.entry.lastUsedAt, 0);
    });
    return entries;
  }

  function makeEntryTextureSignature(item) {
    var entry = item && item.entry || {};
    return [
      String(entry.signature || item.key || ''),
      toNumber(entry.width, 0),
      toNumber(entry.height, 0),
      toNumber(entry.packetCount, 0),
      toNumber(entry.currentViewRotation, 0)
    ].join('|');
  }

  function updateTexture(texture) {
    if (!texture) return false;
    try {
      if (texture.source && typeof texture.source.update === 'function') {
        texture.source.update();
        return true;
      }
    } catch (_) {}
    try {
      if (texture.baseTexture && typeof texture.baseTexture.update === 'function') {
        texture.baseTexture.update();
        return true;
      }
    } catch (_) {}
    try {
      if (typeof texture.update === 'function') {
        texture.update();
        return true;
      }
    } catch (_) {}
    return false;
  }

  function notifyDiagnostics(summary) {
    try {
      var diag = global.__PIXI_MIGRATION_PIXI_STATIC_RUN_SHARED_CONSUMER_DIAGNOSTICS__ || null;
      if (diag && typeof diag.notePixiStaticRunSharedConsumer === 'function') diag.notePixiStaticRunSharedConsumer(summary || {}, { source: summary && summary.source || 'pixi-static-run-consumer' });
    } catch (_) {}
  }

  function consume(options) {
    options = options || {};
    var startAt = nowMs();
    var activeBackend = getActiveBackend();
    var pixi = getPixi();
    var Texture = pixi && pixi.Texture || null;
    var sourceRow = getSourceRow('static-packet-run-cache') || {};
    var entries = getStaticBitmapCacheEntries();
    var candidateRunCount = entries.length;
    var consumedRunCount = 0;
    var textureCreatedThisFrame = 0;
    var textureReusedThisFrame = 0;
    var textureUpdatedThisFrame = 0;
    var skippedRunCount = 0;
    var totalPacketCount = 0;
    var firstSignature = '';
    var lastSignature = '';

    if (!Texture || typeof Texture.from !== 'function') {
      var noPixiSummary = buildSummary({
        activeBackend: activeBackend,
        sourceReady: sourceRow.ready === true,
        candidateRunCount: candidateRunCount,
        consumedRunCount: 0,
        skippedRunCount: candidateRunCount,
        fallbackReason: 'pixi-texture-api-missing',
        source: options.source || 'consume'
      });
      notifyDiagnostics(noPixiSummary);
      return noPixiSummary;
    }

    var limit = Math.min(candidateRunCount, MAX_TEXTURES_PER_FRAME);
    for (var i = 0; i < limit; i++) {
      var item = entries[i];
      var entry = item && item.entry || null;
      if (!entry || !entry.bitmap) {
        skippedRunCount += 1;
        continue;
      }
      var signature = makeEntryTextureSignature(item);
      if (!firstSignature) firstSignature = signature;
      lastSignature = signature;
      totalPacketCount += toNumber(entry.packetCount, 0);
      try {
        var existing = state.textureBySignature[signature] || null;
        if (!existing) {
          existing = Texture.from(entry.bitmap);
          state.textureBySignature[signature] = existing;
          state.textureSignatureByKey[item.key] = signature;
          textureCreatedThisFrame += 1;
          state.totalTextureCreateCount += 1;
        } else {
          textureReusedThisFrame += 1;
          state.totalTextureReuseCount += 1;
          // Canvas bitmap entries are effectively immutable for a given signature;
          // keep an update path for browser/Pixi canvas-source edge cases.
          if (entry.forcePixiTextureUpdate === true && updateTexture(existing)) {
            textureUpdatedThisFrame += 1;
            state.totalTextureUpdateCount += 1;
          }
        }
        consumedRunCount += 1;
      } catch (_) {
        skippedRunCount += 1;
      }
    }

    var visualSummary = consumeVisualStaticRuns(options, entries, Texture);

    state.consumeSeq += 1;
    state.totalCandidateRunCount += candidateRunCount;
    state.totalConsumedRunCount += consumedRunCount;

    var summary = buildSummary({
      activeBackend: activeBackend,
      sourceReady: sourceRow.ready === true || candidateRunCount > 0,
      sourceObserved: sourceRow.observed === true || candidateRunCount > 0,
      candidateRunCount: candidateRunCount,
      consumedRunCount: consumedRunCount,
      skippedRunCount: skippedRunCount + Math.max(0, candidateRunCount - limit),
      totalPacketCount: totalPacketCount,
      textureCreatedThisFrame: textureCreatedThisFrame,
      textureReusedThisFrame: textureReusedThisFrame,
      textureUpdatedThisFrame: textureUpdatedThisFrame,
      visualStaticRunAdoption: visualSummary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: visualSummary.pixiDrawsStaticPacketRuns === true,
      visualAdoptionSuppressedByZoom: options.visualAdoptionSuppressedByZoom === true,
      zoomInteractionActive: options.zoomInteractionActive === true,
      zoomSettlePending: options.zoomSettlePending === true,
      zoom: toNumber(options.zoom, 0),
      depthSafeAdoptedRunCount: visualSummary.depthSafeAdoptedRunCount || 0,
      fullStaticAdoptedRunCount: visualSummary.fullStaticAdoptedRunCount || 0,
      canvas2dSkipPlannedRunCount: visualSummary.canvas2dSkipPlannedRunCount || 0,
      experimentalFullStaticAdoption: options.fullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0,
      visualFallbackReason: visualSummary.fallbackReason || '',
      firstSignature: firstSignature,
      lastSignature: lastSignature,
      sourceRuntimeDetail: sourceRow.runtimeDetail || '',
      wallMs: Math.max(0, nowMs() - startAt),
      source: options.source || 'consume'
    });
    state.lastSummary = summary;
    notifyDiagnostics(summary);
    return summary;
  }


  function getTextureForEntry(item) {
    var signature = makeEntryTextureSignature(item);
    return state.textureBySignature[signature] || null;
  }

  function findEntryByRunKey(entries, runKey) {
    entries = Array.isArray(entries) ? entries : [];
    runKey = String(runKey || '');
    if (!runKey) return null;
    for (var i = 0; i < entries.length; i++) {
      if (makeRunKeyFromEntry(entries[i]) === runKey) return entries[i];
    }
    return null;
  }

  function applyTextureSamplingGuards(texture) {
    var applied = false;
    var pixi = getPixi();
    try {
      if (pixi && pixi.SCALE_MODES && texture && texture.baseTexture) {
        texture.baseTexture.scaleMode = pixi.SCALE_MODES.NEAREST;
        applied = true;
      }
    } catch (_) {}
    try {
      if (texture && texture.source) {
        if ('scaleMode' in texture.source) texture.source.scaleMode = 'nearest';
        if (texture.source.style && 'scaleMode' in texture.source.style) texture.source.style.scaleMode = 'nearest';
        if ('autoGenerateMipmaps' in texture.source) texture.source.autoGenerateMipmaps = false;
        applied = true;
      }
    } catch (_) {}
    return applied;
  }

  function applyStaticRunSpriteTransform(sprite, entry, camera) {
    entry = entry || {};
    camera = camera || {};
    if (!sprite) return { pixelSnapped: false, targetX: 0, targetY: 0, snappedX: 0, snappedY: 0 };
    var targetX = toNumber(entry.minX, 0) + toNumber(camera.x, 0);
    var targetY = toNumber(entry.minY, 0) + toNumber(camera.y, 0);
    var snappedX = Math.round(targetX);
    var snappedY = Math.round(targetY);
    sprite.x = snappedX;
    sprite.y = snappedY;
    sprite.width = Math.max(1, Math.round(toNumber(entry.width, 1)));
    sprite.height = Math.max(1, Math.round(toNumber(entry.height, 1)));
    try { sprite.roundPixels = true; } catch (_) {}
    return {
      pixelSnapped: snappedX !== targetX || snappedY !== targetY,
      targetX: targetX,
      targetY: targetY,
      snappedX: snappedX,
      snappedY: snappedY
    };
  }

  function buildVisualPlanRow(item, runKey, adoptionRevision, retainedFromCommittedPlan) {
    var entry = item && item.entry || {};
    return {
      runKey: runKey,
      runStartIndex: toNumber(entry.runStartIndex, 0),
      packetCount: toNumber(entry.packetCount, 0),
      firstDynamicIndex: toNumber(entry.firstDynamicIndex, 0),
      firstPacketId: String(entry.firstPacketId || ''),
      lastPacketId: String(entry.lastPacketId || ''),
      signature: makeEntryTextureSignature(item),
      experimentalFullStaticAdoption: false,
      retainedFromCommittedPlan: retainedFromCommittedPlan === true,
      planRevision: adoptionRevision,
      createdAt: nowMs(),
      fresh: true,
      adoptionOwner: 'segmented-static-adoption-single-owner'
    };
  }

  function getCurrentCommittedVisualPlan() {
    var plan = state.visualPlanByRunKey || Object.create(null);
    var keys = listObjectKeys(plan);
    var out = Object.create(null);
    for (var i = 0; i < keys.length; i++) {
      var row = plan[keys[i]];
      if (row && row.fresh === true && row.adoptionOwner === 'segmented-static-adoption-single-owner') out[keys[i]] = row;
    }
    return out;
  }

  function consumeVisualStaticRuns(options, entries, Texture) {
    options = options || {};
    entries = Array.isArray(entries) ? entries : [];
    var visualEnabled = options.visualAdoption === true;
    var fullAdoption = options.fullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0;
    var container = options.container || null;
    var camera = options.camera || {};
    var Sprite = getPixi() && getPixi().Sprite || null;
    var freshInfo = getVisualFreshEntries(entries);
    var visualEntries = freshInfo.entries;
    var segmentClassifier = classifyStaticRunSegments(visualEntries);
    var previousVisualPlanByRunKey = getCurrentCommittedVisualPlan();
    var previousVisualPlanRunKeyCount = listObjectKeys(previousVisualPlanByRunKey).length;
    var summary = {
      visualStaticRunAdoption: false,
      pixiDrawsStaticPacketRuns: false,
      depthSafeCandidateRunCount: 0,
      fullStaticCandidateRunCount: 0,
      depthSafeAdoptedRunCount: 0,
      fullStaticAdoptedRunCount: 0,
      canvas2dSkipPlannedRunCount: 0,
      staleRunFilteredCount: Math.max(0, entries.length - visualEntries.length),
      committedPlanRetainedCount: 0,
      spritePixelSnappedCount: 0,
      textureSamplingGuardAppliedCount: 0,
      segmentClassifier: segmentClassifier,
      fallbackReason: visualEnabled ? '' : (options.visualAdoptionSuppressedByZoom === true ? 'zoom-interaction-static-adoption-disabled' : 'visual-adoption-disabled')
    };
    var adoptionRevision = state.visualPlanFrameSeq + 1;
    var removedOrphanCount = 0;
    var visualSpriteSamples = [];
    var possibleHorizontalLineRiskCount = 0;
    var keep = Object.create(null);
    var nextPlanByRunKey = Object.create(null);

    if (options.visualAdoptionSuppressedByZoom === true) {
      emitZoomSeamGuardDiagnostics('zoom-static-adoption-guard', {
        ok: true,
        activeBackend: getActiveBackend(),
        zoomSeamGuard: true,
        visualAdoptionSuppressedByZoom: true,
        zoomInteractionActive: options.zoomInteractionActive === true,
        zoomSettlePending: options.zoomSettlePending === true,
        zoom: toNumber(options.zoom, 0),
        visualStaticRunAdoption: false,
        pixiDrawsStaticPacketRuns: false,
        canvas2dDrawsStaticDuringZoom: true,
        staticRunSplitDisabledDuringZoom: true,
        fallbackReason: summary.fallbackReason || 'zoom-interaction-static-adoption-disabled',
        source: options.source || 'pixi-static-run-zoom-seam-guard'
      });
    }

    function adoptItem(item, retainedFromCommittedPlan) {
      var entry = item && item.entry || null;
      if (!entry || !entry.bitmap) return false;
      var eligible = fullAdoption ? isStaticRunEntryAdoptable(item) : isDepthSafePrefixEntry(item);
      if (!eligible) return false;
      var runKey = makeRunKeyFromEntry(item);
      var texture = getTextureForEntry(item);
      if (!texture) return false;
      var sprite = state.visualSpriteByRunKey[runKey] || null;
      try {
        if (!sprite) {
          sprite = new Sprite(texture);
          sprite.label = retainedFromCommittedPlan ? 'pixi-migration-committed-static-run-retained' : (fullAdoption ? 'pixi-migration-full-static-run-experimental' : 'pixi-migration-depth-safe-static-run-prefix');
          sprite.__pixiStaticRunKey = runKey;
          try { sprite.eventMode = 'none'; } catch (_) {}
          state.visualSpriteByRunKey[runKey] = sprite;
        } else {
          sprite.texture = texture;
        }
        if (applyTextureSamplingGuards(texture)) summary.textureSamplingGuardAppliedCount += 1;
        var transformInfo = applyStaticRunSpriteTransform(sprite, entry, camera);
        if (transformInfo.pixelSnapped) {
          summary.spritePixelSnappedCount += 1;
          state.spritePixelSnapCount += 1;
        }
        sprite.__pixiStaticRunStartIndex = toNumber(entry.runStartIndex, 0);
        sprite.__pixiStaticRunRetainedFromCommittedPlan = retainedFromCommittedPlan === true;
        var spriteSample = summarizeVisualSprite(item, entry, sprite, texture, camera, runKey, makeEntryTextureSignature(item));
        spriteSample.pixelSnapped = transformInfo.pixelSnapped;
        spriteSample.unsnappedX = transformInfo.targetX;
        spriteSample.unsnappedY = transformInfo.targetY;
        spriteSample.spriteX = transformInfo.snappedX;
        spriteSample.spriteY = transformInfo.snappedY;
        spriteSample.textureSamplingGuardApplied = true;
        spriteSample.retainedFromCommittedPlan = retainedFromCommittedPlan === true;
        if (spriteSample.possibleHorizontalLineRisk) possibleHorizontalLineRiskCount += 1;
        if (visualSpriteSamples.length < 6) visualSpriteSamples.push(spriteSample);
        if (sprite.parent !== container && typeof container.addChild === 'function') container.addChild(sprite);
        keep[runKey] = true;
        nextPlanByRunKey[runKey] = buildVisualPlanRow(item, runKey, adoptionRevision, retainedFromCommittedPlan);
        if (isDepthSafePrefixEntry(item)) summary.depthSafeAdoptedRunCount += 1;
        summary.fullStaticAdoptedRunCount += 1;
        if (retainedFromCommittedPlan) summary.committedPlanRetainedCount += 1;
        return true;
      } catch (_) {
        return false;
      }
    }

    if (!visualEnabled) {
      removedOrphanCount = clearContainer(container, Object.create(null));
      state.visualPlanByRunKey = Object.create(null);
      state.activeVisualPlanRevision = adoptionRevision;
      state.visualPlanFrameSeq = adoptionRevision;
      var disabledDiff = computeRunKeyDiff(previousVisualPlanByRunKey, state.visualPlanByRunKey);
      emitSingleOwnerDiagnostics('fallback', buildSingleOwnerDiagnosticsSummary(summary, options, {
        adoptionRevision: adoptionRevision,
        orphanPixiStaticSprites: removedOrphanCount,
        fallbackReason: summary.fallbackReason
      }));
      emitGlitchDiagnostics('plan-transition', Object.assign({
        step: GLITCH_DIAG_STEP,
        activeBackend: getActiveBackend(),
        adoptionRevision: adoptionRevision,
        visualEnabled: false,
        visualStaticRunAdoption: false,
        removedOrphanPixiStaticSprites: removedOrphanCount,
        previousVisualPlanRunKeyCount: previousVisualPlanRunKeyCount,
        currentVisualPlanRunKeyCount: 0,
        adoptionToggledOff: previousVisualPlanRunKeyCount > 0,
        fallbackReason: summary.fallbackReason,
        source: options.source || 'pixi-static-run-visual-disabled'
      }, disabledDiff));
      emitStableAdoptionDiagnostics('stable-adoption', buildStableAdoptionDiagnosticsSummary(summary, options, {
        adoptionRevision: adoptionRevision,
        committedPlanRetainedCount: 0,
        orphanPixiStaticSprites: removedOrphanCount,
        fallbackReason: summary.fallbackReason
      }));
      return summary;
    }
    if (!container || typeof Sprite !== 'function' || !Texture) {
      summary.fallbackReason = 'pixi-static-run-visual-container-or-sprite-missing';
      removedOrphanCount = clearContainer(container, Object.create(null));
      state.visualPlanByRunKey = Object.create(null);
      state.activeVisualPlanRevision = adoptionRevision;
      state.visualPlanFrameSeq = adoptionRevision;
      var missingContainerDiff = computeRunKeyDiff(previousVisualPlanByRunKey, state.visualPlanByRunKey);
      emitSingleOwnerDiagnostics('fallback', buildSingleOwnerDiagnosticsSummary(summary, options, {
        adoptionRevision: adoptionRevision,
        orphanPixiStaticSprites: removedOrphanCount,
        fallbackReason: summary.fallbackReason
      }));
      emitGlitchDiagnostics('plan-transition', Object.assign({
        step: GLITCH_DIAG_STEP,
        activeBackend: getActiveBackend(),
        adoptionRevision: adoptionRevision,
        visualEnabled: visualEnabled,
        visualStaticRunAdoption: false,
        removedOrphanPixiStaticSprites: removedOrphanCount,
        previousVisualPlanRunKeyCount: previousVisualPlanRunKeyCount,
        currentVisualPlanRunKeyCount: 0,
        adoptionToggledOff: previousVisualPlanRunKeyCount > 0,
        fallbackReason: summary.fallbackReason,
        source: options.source || 'pixi-static-run-visual-container-missing'
      }, missingContainerDiff));
      emitStableAdoptionDiagnostics('stable-adoption', buildStableAdoptionDiagnosticsSummary(summary, options, {
        adoptionRevision: adoptionRevision,
        committedPlanRetainedCount: 0,
        orphanPixiStaticSprites: removedOrphanCount,
        fallbackReason: summary.fallbackReason
      }));
      return summary;
    }

    var maxVisualRuns = Math.max(0, Math.round(toNumber(options.maxVisualRuns, fullAdoption ? MAX_VISUAL_RUNS : 1)));
    for (var i = 0; i < visualEntries.length && summary.fullStaticAdoptedRunCount < maxVisualRuns; i++) {
      var item = visualEntries[i];
      if (isDepthSafePrefixEntry(item)) summary.depthSafeCandidateRunCount += 1;
      if (fullAdoption && isStaticRunEntryAdoptable(item)) summary.fullStaticCandidateRunCount += 1;
      adoptItem(item, false);
    }

    // PXM-07.9F: once a depth-safe run has been adopted, its Pixi texture is a
    // valid cache source. Do not revoke adoption just because Canvas2D skipped the
    // run this frame and therefore did not update lastUsedAt. Retain the committed
    // plan while the same runKey/signature/depth condition is still present.
    if (summary.fullStaticAdoptedRunCount === 0 && previousVisualPlanRunKeyCount > 0) {
      var committedKeys = listObjectKeys(previousVisualPlanByRunKey);
      for (var ck = 0; ck < committedKeys.length && summary.fullStaticAdoptedRunCount < maxVisualRuns; ck++) {
        var retainedItem = findEntryByRunKey(entries, committedKeys[ck]);
        if (!retainedItem) continue;
        adoptItem(retainedItem, true);
      }
    }

    try {
      if (container && Array.isArray(container.children)) {
        container.children.sort(function (a, b) {
          return toNumber(a && a.__pixiStaticRunStartIndex, 0) - toNumber(b && b.__pixiStaticRunStartIndex, 0);
        });
      }
    } catch (_) {}
    state.visualPlanByRunKey = nextPlanByRunKey;
    removedOrphanCount = clearContainer(container, keep);
    summary.canvas2dSkipPlannedRunCount = Object.keys(state.visualPlanByRunKey).length;
    summary.segmentClassifier.adoptedSegmentCount = summary.canvas2dSkipPlannedRunCount;
    summary.segmentClassifier.nonAdoptedSegmentCount = Math.max(0, summary.segmentClassifier.segmentCount - summary.segmentClassifier.adoptedSegmentCount);
    summary.visualStaticRunAdoption = summary.fullStaticAdoptedRunCount > 0;
    summary.pixiDrawsStaticPacketRuns = summary.visualStaticRunAdoption;
    summary.fallbackReason = summary.visualStaticRunAdoption
      ? (summary.committedPlanRetainedCount > 0 ? 'committed-static-run-plan-retained' : (fullAdoption ? 'experimental-full-static-run-adopted' : 'depth-safe-prefix-static-run-adopted'))
      : (fullAdoption ? 'no-full-static-run-texture-ready' : 'no-depth-safe-prefix-run-texture-ready');
    state.retainedCommittedPlanCount += summary.committedPlanRetainedCount;
    state.totalVisualAdoptedRunCount += summary.fullStaticAdoptedRunCount;
    state.activeVisualPlanRevision = adoptionRevision;
    state.visualPlanFrameSeq = adoptionRevision;
    state.lastVisualSummary = buildSingleOwnerDiagnosticsSummary(summary, options, {
      adoptionRevision: adoptionRevision,
      orphanPixiStaticSprites: removedOrphanCount,
      activeVisualSpriteCount: Object.keys(state.visualPlanByRunKey).length,
      fallbackReason: summary.fallbackReason
    });
    var planDiff = computeRunKeyDiff(previousVisualPlanByRunKey, state.visualPlanByRunKey);
    var currentPlanRunKeyCount = listObjectKeys(state.visualPlanByRunKey).length;
    emitSegmentedDiagnostics('segment-classifier', buildSegmentedDiagnosticsSummary(summary, options));
    emitSegmentedDiagnostics(summary.visualStaticRunAdoption ? 'exclusive-ownership' : 'fallback', buildSegmentedDiagnosticsSummary(summary, options));
    emitSingleOwnerDiagnostics(summary.visualStaticRunAdoption ? 'visual-adoption' : 'fallback', state.lastVisualSummary);
    emitGlitchDiagnostics('plan-transition', Object.assign({
      step: GLITCH_DIAG_STEP,
      activeBackend: getActiveBackend(),
      adoptionRevision: adoptionRevision,
      visualEnabled: visualEnabled,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      previousVisualPlanRunKeyCount: previousVisualPlanRunKeyCount,
      currentVisualPlanRunKeyCount: currentPlanRunKeyCount,
      adoptionToggledOn: previousVisualPlanRunKeyCount === 0 && currentPlanRunKeyCount > 0,
      adoptionToggledOff: previousVisualPlanRunKeyCount > 0 && currentPlanRunKeyCount === 0,
      removedOrphanPixiStaticSprites: removedOrphanCount,
      staleRunFilteredCount: summary.staleRunFilteredCount || 0,
      committedPlanRetainedCount: summary.committedPlanRetainedCount || 0,
      fallbackReason: summary.fallbackReason || '',
      source: options.source || 'pixi-static-run-visual-adoption'
    }, planDiff));
    emitGlitchDiagnostics('sprite-bounds', {
      step: GLITCH_DIAG_STEP,
      activeBackend: getActiveBackend(),
      adoptionRevision: adoptionRevision,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      activeVisualSpriteCount: currentPlanRunKeyCount,
      removedOrphanPixiStaticSprites: removedOrphanCount,
      possibleHorizontalLineRiskCount: possibleHorizontalLineRiskCount,
      sampleVisualSprites: visualSpriteSamples,
      source: options.source || 'pixi-static-run-visual-adoption'
    });
    emitStableAdoptionDiagnostics('stable-adoption', buildStableAdoptionDiagnosticsSummary(summary, options, {
      adoptionRevision: adoptionRevision,
      orphanPixiStaticSprites: removedOrphanCount,
      activeVisualSpriteCount: currentPlanRunKeyCount,
      previousVisualPlanRunKeyCount: previousVisualPlanRunKeyCount,
      currentVisualPlanRunKeyCount: currentPlanRunKeyCount,
      committedPlanRetainedCount: summary.committedPlanRetainedCount || 0,
      possibleHorizontalLineRiskCount: possibleHorizontalLineRiskCount,
      spritePixelSnappedCount: summary.spritePixelSnappedCount || 0,
      textureSamplingGuardAppliedCount: summary.textureSamplingGuardAppliedCount || 0,
      fallbackReason: summary.fallbackReason || ''
    }));
    emitStableAdoptionDiagnostics('sprite-edge', buildStableAdoptionDiagnosticsSummary(summary, options, {
      adoptionRevision: adoptionRevision,
      orphanPixiStaticSprites: removedOrphanCount,
      activeVisualSpriteCount: currentPlanRunKeyCount,
      committedPlanRetainedCount: summary.committedPlanRetainedCount || 0,
      possibleHorizontalLineRiskCount: possibleHorizontalLineRiskCount,
      spritePixelSnappedCount: summary.spritePixelSnappedCount || 0,
      textureSamplingGuardAppliedCount: summary.textureSamplingGuardAppliedCount || 0,
      sampleVisualSprites: visualSpriteSamples,
      fallbackReason: summary.fallbackReason || ''
    }));
    if (removedOrphanCount > 0) {
      emitGlitchDiagnostics('orphan-cleanup', {
        step: GLITCH_DIAG_STEP,
        activeBackend: getActiveBackend(),
        adoptionRevision: adoptionRevision,
        removedOrphanPixiStaticSprites: removedOrphanCount,
        previousVisualPlanRunKeyCount: previousVisualPlanRunKeyCount,
        currentVisualPlanRunKeyCount: currentPlanRunKeyCount,
        staleRunFilteredCount: summary.staleRunFilteredCount || 0,
        committedPlanRetainedCount: summary.committedPlanRetainedCount || 0,
        fallbackReason: summary.fallbackReason || '',
        source: options.source || 'pixi-static-run-visual-adoption'
      });
    }
    emitLegacyVisualDiagnostics(summary.visualStaticRunAdoption ? 'visual-adoption' : 'fallback', state.lastVisualSummary);
    return summary;
  }

  function buildStableAdoptionDiagnosticsSummary(summary, options, extra) {
    summary = summary || {};
    options = options || {};
    extra = extra || {};
    var classifier = summary.segmentClassifier || {};
    return {
      step: STABLE_ADOPTION_STEP,
      owner: OWNER,
      phase: 'pixi-static-run-stable-adoption-and-sprite-edge-fix',
      ok: true,
      activeBackend: getActiveBackend(),
      adoptionOwner: 'segmented-static-adoption-single-owner',
      stableCommittedPlan: true,
      committedPlanRetainedCount: toNumber(extra.committedPlanRetainedCount, summary.committedPlanRetainedCount || 0),
      totalCommittedPlanRetainedCount: state.retainedCommittedPlanCount,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      adoptedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount || summary.depthSafeAdoptedRunCount, 0),
      previousVisualPlanRunKeyCount: toNumber(extra.previousVisualPlanRunKeyCount, 0),
      currentVisualPlanRunKeyCount: toNumber(extra.currentVisualPlanRunKeyCount, summary.canvas2dSkipPlannedRunCount || 0),
      adoptionToggledOffPrevented: toNumber(extra.committedPlanRetainedCount, summary.committedPlanRetainedCount || 0) > 0,
      canvas2dSkipPlannedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount, 0),
      staleRunFilteredCount: toNumber(summary.staleRunFilteredCount, 0),
      orphanPixiStaticSprites: toNumber(extra.orphanPixiStaticSprites, 0),
      activeVisualSpriteCount: toNumber(extra.activeVisualSpriteCount, summary.canvas2dSkipPlannedRunCount || 0),
      spriteEdgeFixApplied: true,
      spritePixelSnapping: true,
      spritePixelSnappedCount: toNumber(extra.spritePixelSnappedCount, summary.spritePixelSnappedCount || 0),
      textureSamplingGuardApplied: true,
      textureSamplingGuardAppliedCount: toNumber(extra.textureSamplingGuardAppliedCount, summary.textureSamplingGuardAppliedCount || 0),
      possibleHorizontalLineRiskCount: toNumber(extra.possibleHorizontalLineRiskCount, 0),
      sampleVisualSprites: extra.sampleVisualSprites || [],
      segmentCount: toNumber(classifier.segmentCount, 0),
      prefixSafeSegmentCount: toNumber(classifier.prefixSafeSegmentCount, 0),
      onlyPrefixBeforeFirstDynamic: true,
      depthInterleavingProtected: true,
      canvas2dFallback: 'enabled-for-nonadopted-runs-only',
      canvas2dSkippedOnlyFreshAdoptedRuns: true,
      stalePlanBlocksCanvas2dSkip: true,
      noDoubleDrawForAdoptedRuns: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      zoomSeamGuard: options.visualAdoptionSuppressedByZoom === true,
      visualAdoptionSuppressedByZoom: options.visualAdoptionSuppressedByZoom === true,
      zoomInteractionActive: options.zoomInteractionActive === true,
      zoomSettlePending: options.zoomSettlePending === true,
      zoom: toNumber(options.zoom, 0),
      fallbackReason: extra.fallbackReason || summary.fallbackReason || '',
      source: options.source || 'pixi-static-run-stable-adoption'
    };
  }


  function buildSingleOwnerDiagnosticsSummary(summary, options, extra) {
    summary = summary || {};
    options = options || {};
    extra = extra || {};
    var classifier = summary.segmentClassifier || {};
    return {
      step: SINGLE_OWNER_STEP,
      owner: OWNER,
      phase: 'pixi-static-run-single-adoption-owner-cleanup',
      ok: true,
      activeBackend: getActiveBackend(),
      adoptionOwner: 'segmented-static-adoption-single-owner',
      singleAdoptionOwner: true,
      legacyPXM079AVisualOwnerDisabled: true,
      legacyPXM079ACanvas2dSkipDisabled: true,
      experimentalFullStaticAdoption: false,
      fullStaticAdoptionDisabled: true,
      adoptionPolicy: options.adoptionPolicy || 'single-owner-prefix-exclusive',
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      depthSafeAdoptedRunCount: toNumber(summary.depthSafeAdoptedRunCount, 0),
      adoptedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount || summary.depthSafeAdoptedRunCount, 0),
      canvas2dSkipPlannedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount, 0),
      segmentCount: toNumber(classifier.segmentCount, 0),
      prefixSafeSegmentCount: toNumber(classifier.prefixSafeSegmentCount, 0),
      adoptedSegmentCount: toNumber(classifier.adoptedSegmentCount, 0),
      nonAdoptedSegmentCount: toNumber(classifier.nonAdoptedSegmentCount, 0),
      staleRunFilteredCount: toNumber(summary.staleRunFilteredCount, 0),
      staleCanvas2dSkipBlocked: state.staleCanvas2dSkipBlockedCount,
      stalePlanBlocksCanvas2dSkip: true,
      canvas2dSkippedOnlyFreshAdoptedRuns: true,
      runKeyRevisionMatched: true,
      adoptionRevision: toNumber(extra.adoptionRevision, state.activeVisualPlanRevision || 0),
      orphanPixiStaticSprites: toNumber(extra.orphanPixiStaticSprites, 0),
      activeVisualSpriteCount: toNumber(extra.activeVisualSpriteCount, summary.canvas2dSkipPlannedRunCount || 0),
      noDoubleDrawForAdoptedRuns: true,
      canvas2dFallback: 'enabled-for-nonadopted-runs-only',
      depthInterleavingProtected: true,
      onlyPrefixBeforeFirstDynamic: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      zoomSeamGuard: options.visualAdoptionSuppressedByZoom === true,
      visualAdoptionSuppressedByZoom: options.visualAdoptionSuppressedByZoom === true,
      zoomInteractionActive: options.zoomInteractionActive === true,
      zoomSettlePending: options.zoomSettlePending === true,
      zoom: toNumber(options.zoom, 0),
      fallbackReason: extra.fallbackReason || summary.fallbackReason || '',
      source: options.source || 'pixi-static-run-single-owner-cleanup'
    };
  }


  function buildSegmentedDiagnosticsSummary(summary, options) {
    summary = summary || {};
    options = options || {};
    var classifier = summary.segmentClassifier || {};
    return {
      step: SEGMENTED_STEP,
      owner: OWNER,
      phase: 'pixi-static-run-segmented-adoption-step1-prefix-exclusive',
      ok: true,
      activeBackend: getActiveBackend(),
      splitPlanStep: '1/3',
      currentStage: 'prefix-exclusive-adoption-plus-segment-classifier',
      nextStage: 'depth-segment-plan-review',
      finalStage: 'single-renderer-or-mixed-depth-handoff',
      adoptionPolicy: options.adoptionPolicy || 'segmented-prefix-exclusive-step1',
      experimentalFullStaticAdoption: false,
      fullStaticAdoptionDisabled: true,
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      canvas2dSkipPlannedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount, 0),
      segmentCount: toNumber(classifier.segmentCount, 0),
      prefixSafeSegmentCount: toNumber(classifier.prefixSafeSegmentCount, 0),
      adoptedSegmentCount: toNumber(classifier.adoptedSegmentCount, 0),
      nonAdoptedSegmentCount: toNumber(classifier.nonAdoptedSegmentCount, 0),
      unsafeAfterDynamicSegmentCount: toNumber(classifier.unsafeAfterDynamicSegmentCount, 0),
      unsafeCrossDynamicSegmentCount: toNumber(classifier.unsafeCrossDynamicSegmentCount, 0),
      sampleSegments: classifier.sampleSegments || [],
      pixiOwnsAdoptedStaticRuns: summary.visualStaticRunAdoption === true,
      canvas2dSkipsAdoptedRuns: toNumber(summary.canvas2dSkipPlannedRunCount, 0) > 0,
      noDoubleDrawForAdoptedRuns: true,
      nonAdoptedStaticFallback: 'canvas2d-temporary-until-pixi-depth-handoff',
      canvas2dFallback: 'enabled-for-nonadopted-runs-only',
      depthInterleavingProtected: true,
      onlyPrefixBeforeFirstDynamic: true,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: options.source || 'pixi-static-run-segmented-adoption'
    };
  }

  function buildVisualDiagnosticsSummary(summary, options) {
    summary = summary || {};
    options = options || {};
    return {
      step: (options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0) ? FULL_VISUAL_STEP : VISUAL_STEP,
      owner: OWNER,
      phase: (options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0) ? 'pixi-static-run-full-visual-adoption-experimental' : 'pixi-static-run-depth-aware-visual-adoption',
      ok: true,
      activeBackend: getActiveBackend(),
      visualStaticRunAdoption: summary.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: summary.pixiDrawsStaticPacketRuns === true,
      depthSafeCandidateRunCount: toNumber(summary.depthSafeCandidateRunCount, 0),
      depthSafeAdoptedRunCount: toNumber(summary.depthSafeAdoptedRunCount, 0),
      fullStaticCandidateRunCount: toNumber(summary.fullStaticCandidateRunCount, 0),
      fullStaticAdoptedRunCount: toNumber(summary.fullStaticAdoptedRunCount, 0),
      canvas2dSkipPlannedRunCount: toNumber(summary.canvas2dSkipPlannedRunCount, 0),
      staleRunFilteredCount: toNumber(summary.staleRunFilteredCount, 0),
      totalVisualAdoptedRunCount: state.totalVisualAdoptedRunCount,
      totalCanvas2dSkippedRunCount: state.totalCanvas2dSkippedRunCount,
      adoptionPolicy: options.adoptionPolicy || 'prefix-static-run-only',
      experimentalFullStaticAdoption: options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0,
      canvas2dStaticFallback: 'enabled-for-nonadopted-runs',
      canvas2dFallback: 'enabled',
      depthInterleavingProtected: !(options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0),
      fullStaticAdoptionKnownDepthRisk: options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0,
      blockedByDepthInterleaving: false,
      onlyPrefixBeforeFirstDynamic: !(options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0),
      maxVisualRuns: toNumber(options.maxVisualRuns, 1),
      fallbackReason: summary.fallbackReason || '',
      consumerMigration: (options.experimentalFullStaticAdoption === true || String(options.adoptionPolicy || '').indexOf('all-static-runs') >= 0) ? 'pixi-experimental-full-static-run-visual-adoption' : 'pixi-depth-aware-prefix-static-run-visual-adoption',
      drawBehaviorChanged: true,
      modifiesRendering: true,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: true,
      changesDepthSort: false,
      changesPicking: false,
      changesRenderOrder: false,
      changesObjectData: false,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      source: options.source || 'pixi-static-run-visual-adoption'
    };
  }

  function shouldSkipCanvas2dStaticRun(packets, meta, runStartIndex) {
    if (isZoomSingleWorldOwnerActive()) return false;
    packets = Array.isArray(packets) ? packets : [];
    meta = meta || {};
    var runKey = makeRunKeyFromPackets(packets, meta, runStartIndex);
    var plan = state.visualPlanByRunKey && state.visualPlanByRunKey[runKey] || null;
    if (!plan) return false;
    var planRevision = toNumber(plan.planRevision, -1);
    var activeRevision = toNumber(state.activeVisualPlanRevision, -2);
    var fresh = plan.fresh === true && planRevision === activeRevision && plan.adoptionOwner === 'segmented-static-adoption-single-owner';
    if (!fresh) {
      state.staleCanvas2dSkipBlockedCount += 1;
      emitSingleOwnerDiagnostics('stale-skip-blocked', {
        ok: true,
        activeBackend: getActiveBackend(),
        runKey: runKey,
        runStartIndex: runStartIndex,
        packetCount: packets.length,
        planRevision: planRevision,
        adoptionRevision: activeRevision,
        runKeyRevisionMatched: false,
        visualStaticRunAdoption: true,
        pixiDrawsStaticPacketRuns: true,
        canvas2dSkippedOnlyFreshAdoptedRuns: true,
        stalePlanBlocksCanvas2dSkip: true,
        staleCanvas2dSkipBlocked: state.staleCanvas2dSkipBlockedCount,
        changesDepthSort: false,
        changesPicking: false,
        source: 'canvas2d-renderable-order-draw'
      });
      emitGlitchDiagnostics('canvas2d-skip-debug', {
        step: GLITCH_DIAG_STEP,
        activeBackend: getActiveBackend(),
        runKey: runKey,
        runStartIndex: runStartIndex,
        packetCount: packets.length,
        planFound: true,
        planFresh: false,
        skipDecision: false,
        skipReason: 'stale-plan-blocked',
        planRevision: planRevision,
        adoptionRevision: activeRevision,
        runKeyRevisionMatched: false,
        source: 'canvas2d-renderable-order-draw'
      });
      return false;
    }
    state.totalCanvas2dSkippedRunCount += 1;
    emitSingleOwnerDiagnostics('canvas2d-skip', {
      ok: true,
      activeBackend: getActiveBackend(),
      runKey: runKey,
      runStartIndex: runStartIndex,
      packetCount: packets.length,
      visualStaticRunAdoption: true,
      pixiDrawsStaticPacketRuns: true,
      canvas2dSkippedAdoptedRun: true,
      canvas2dSkippedOnlyFreshAdoptedRuns: true,
      stalePlanBlocksCanvas2dSkip: true,
      adoptionRevision: activeRevision,
      planRevision: planRevision,
      runKeyRevisionMatched: true,
      orphanPixiStaticSprites: 0,
      canvas2dStaticFallback: 'enabled-for-nonadopted-runs',
      depthInterleavingProtected: true,
      fullStaticAdoptionKnownDepthRisk: false,
      onlyPrefixBeforeFirstDynamic: true,
      experimentalFullStaticAdoption: false,
      changesDepthSort: false,
      changesPicking: false,
      source: 'canvas2d-renderable-order-draw'
    });
    emitGlitchDiagnostics('canvas2d-skip-debug', {
      step: GLITCH_DIAG_STEP,
      activeBackend: getActiveBackend(),
      runKey: runKey,
      runStartIndex: runStartIndex,
      packetCount: packets.length,
      planFound: true,
      planFresh: true,
      skipDecision: true,
      skipReason: 'fresh-adopted-run',
      planRevision: planRevision,
      adoptionRevision: activeRevision,
      runKeyRevisionMatched: true,
      source: 'canvas2d-renderable-order-draw'
    });
    return true;
  }

  function buildSummary(payload) {
    payload = payload || {};
    var consumedRunCount = toNumber(payload.consumedRunCount, 0);
    var candidateRunCount = toNumber(payload.candidateRunCount, 0);
    return {
      step: STEP,
      owner: OWNER,
      phase: PHASE,
      mode: MODE,
      ok: true,
      activeBackend: payload.activeBackend || getActiveBackend(),
      usesSharedStaticPacketRunCache: consumedRunCount > 0,
      sharedStaticRunSourceReady: payload.sourceReady === true,
      sharedStaticRunSourceObserved: payload.sourceObserved === true || candidateRunCount > 0,
      staticRunCandidateCount: candidateRunCount,
      staticRunTextureConsumedCount: consumedRunCount,
      skippedRunCount: toNumber(payload.skippedRunCount, 0),
      staticRunPacketCount: toNumber(payload.totalPacketCount, 0),
      textureCreatedThisFrame: toNumber(payload.textureCreatedThisFrame, 0),
      textureReusedThisFrame: toNumber(payload.textureReusedThisFrame, 0),
      textureUpdatedThisFrame: toNumber(payload.textureUpdatedThisFrame, 0),
      totalTextureCreateCount: state.totalTextureCreateCount,
      totalTextureReuseCount: state.totalTextureReuseCount,
      totalTextureUpdateCount: state.totalTextureUpdateCount,
      textureCacheSize: Object.keys(state.textureBySignature).length,
      firstSignature: payload.firstSignature || '',
      lastSignature: payload.lastSignature || '',
      sourceRuntimeDetail: payload.sourceRuntimeDetail || '',
      visualStaticRunAdoption: payload.visualStaticRunAdoption === true,
      pixiDrawsStaticPacketRuns: payload.pixiDrawsStaticPacketRuns === true,
      visualAdoptionSuppressedByZoom: payload.visualAdoptionSuppressedByZoom === true,
      zoomInteractionActive: payload.zoomInteractionActive === true,
      zoomSettlePending: payload.zoomSettlePending === true,
      zoom: toNumber(payload.zoom, 0),
      depthSafeAdoptedRunCount: toNumber(payload.depthSafeAdoptedRunCount, 0),
      fullStaticAdoptedRunCount: toNumber(payload.fullStaticAdoptedRunCount, 0),
      experimentalFullStaticAdoption: payload.experimentalFullStaticAdoption === true,
      canvas2dSkipPlannedRunCount: toNumber(payload.canvas2dSkipPlannedRunCount, 0),
      canvas2dStaticFallback: payload.visualStaticRunAdoption === true ? 'enabled-for-nonadopted-runs' : 'enabled',
      canvas2dFallback: 'enabled',
      depthInterleavingProtected: payload.experimentalFullStaticAdoption === true ? false : true,
      fullStaticAdoptionKnownDepthRisk: payload.experimentalFullStaticAdoption === true,
      blockedByDepthInterleaving: payload.visualStaticRunAdoption === true ? false : true,
      fallbackReason: payload.visualFallbackReason || payload.fallbackReason || (payload.visualStaticRunAdoption === true ? (payload.experimentalFullStaticAdoption === true ? 'experimental-full-static-run-adopted' : 'depth-safe-prefix-static-run-adopted') : (consumedRunCount > 0 ? 'visual-adoption-blocked-until-depth-order-handoff' : 'no-static-run-textures-consumed-yet')),
      consumerMigration: payload.visualStaticRunAdoption === true ? (payload.experimentalFullStaticAdoption === true ? 'pixi-experimental-full-static-run-visual-adoption' : 'pixi-depth-aware-prefix-static-run-visual-adoption') : 'pixi-texture-cache-nonvisual',
      drawBehaviorChanged: payload.visualStaticRunAdoption === true,
      modifiesRendering: payload.visualStaticRunAdoption === true,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      changesDepthSort: false,
      changesPicking: false,
      changesRenderOrder: false,
      changesObjectData: false,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      wallMs: Number(toNumber(payload.wallMs, 0).toFixed ? toNumber(payload.wallMs, 0).toFixed(3) : toNumber(payload.wallMs, 0)),
      source: payload.source || 'pixi-static-run-consumer'
    };
  }

  function getLastSummary() {
    return state.lastSummary || buildSummary({ source: 'last-summary' });
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    step: STEP,
    mode: MODE,
    consume: consume,
    shouldSkipCanvas2dStaticRun: shouldSkipCanvas2dStaticRun,
    getLastSummary: getLastSummary,
    getLastVisualSummary: function () { return state.lastVisualSummary || buildSingleOwnerDiagnosticsSummary({}, { source: 'last-visual-summary' }, {}); }
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_RUN_CONSUMER__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.pixiStaticRunConsumer', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.pixiStaticRunConsumer = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_PIXI_STATIC_RUN_CONSUMER__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
