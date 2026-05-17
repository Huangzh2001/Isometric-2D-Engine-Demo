// PXM-07.14K: renderer-neutral static-world GPU chunk-cache input planner with stable depth-band grouping diagnostics.
// Layer: presentation/render/optimization.
//
// This module does NOT render and does NOT consume Canvas2D raster output.
// It only groups already-built static-world-face-packets into chunk-level
// cache inputs so the next stage can replace per-packet Pixi Graphics with
// chunk-level RenderTexture/Mesh caches without reimplementing scene logic.
(function registerStaticWorldGpuChunkCacheInput(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/static-world-gpu-chunk-cache-input.js';
  var STEP = 'PXM-07.14K';
  var PHASE = 'static-world-gpu-chunk-cache-input-depth-band-plan';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';

  var state = {
    frameSeq: 0,
    chunkCache: Object.create(null),
    activeFrame: null,
    lastSummary: null
  };

  function nowMs() {
    try { return (global.performance && typeof global.performance.now === 'function') ? global.performance.now() : Date.now(); }
    catch (_) { return Date.now(); }
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function safeRound(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) n = 0;
    var factor = Math.pow(10, digits == null ? 4 : digits);
    return Math.round(n * factor) / factor;
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

  function sanitizeStaticTextureVersionRotation(version, staticRotation) {
    var raw = version == null ? '' : String(version);
    if (!raw) return '';
    var snapped = Number(staticRotation || 0);
    var out = raw;
    try { out = out.replace(/("viewRotation"\s*:\s*)-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/ig, '$1' + String(snapped)); } catch (_) { out = raw; }
    try {
      var parts = out.split('|');
      if (parts.length >= 6 && /^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(parts[2])) {
        parts[2] = String(snapped);
        out = parts.join('|');
      }
    } catch (_) {}
    return out;
  }

  function emit(section, payload) {
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

  function getSettings(deps) {
    try { if (deps && typeof deps.getSettings === 'function') return deps.getSettings() || {}; } catch (_) {}
    try { if (deps && deps.settings) return deps.settings || {}; } catch (_) {}
    return {};
  }

  function getChunkSize(deps) {
    var settings = getSettings(deps);
    var fromSettings = Number(settings && (settings.chunkSize || settings.staticChunkSize || settings.terrainChunkSize));
    if (Number.isFinite(fromSettings) && fromSettings > 0) return Math.max(1, Math.round(fromSettings));
    try {
      var runtimeApi = global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.getPath === 'function'
        ? global.__APP_NAMESPACE.getPath('state.runtimeState')
        : null;
      if (runtimeApi && typeof runtimeApi.getTerrainRuntimeModelValue === 'function') {
        var model = runtimeApi.getTerrainRuntimeModelValue() || null;
        if (model && Number(model.chunkSize) > 0) return Math.max(1, Math.round(Number(model.chunkSize)));
      }
      if (runtimeApi && runtimeApi.terrainLogic && Number(runtimeApi.terrainLogic.chunkSize) > 0) return Math.max(1, Math.round(Number(runtimeApi.terrainLogic.chunkSize)));
    } catch (_) {}
    return 16;
  }

  function inferChunkKey(packet, deps) {
    try {
      if (packet && packet.chunkKey != null) return String(packet.chunkKey || '0,0');
      if (packet && packet.staticChunkKey != null) return String(packet.staticChunkKey || '0,0');
      if (packet && packet.box && packet.box.chunkKey != null) return String(packet.box.chunkKey || '0,0');
    } catch (_) {}
    var x = toNumber(packet && packet.cellX, toNumber(packet && packet.box && packet.box.x, 0));
    var y = toNumber(packet && packet.cellY, toNumber(packet && packet.box && packet.box.y, 0));
    var size = getChunkSize(deps);
    return String(Math.floor(x / size)) + ',' + String(Math.floor(y / size));
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

  function inferStableDepthBand(packet) {
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

  function getFaceMergeSnapshot() {
    try {
      if (typeof global.getStaticWorldFaceMergeControlStateSnapshotForRender === 'function') {
        return global.getStaticWorldFaceMergeControlStateSnapshotForRender() || null;
      }
    } catch (_) {}
    return null;
  }

  function getSharedFrameSnapshot() {
    try { return global.__PIXI_MIGRATION_ACTIVE_SHARED_RENDER_FRAME_SNAPSHOT__ || null; } catch (_) {}
    return null;
  }

  function materialSignature(packet) {
    return [
      'fill=' + String(packet && packet.fill || ''),
      'stroke=' + String(packet && packet.stroke || ''),
      'width=' + String(packet && packet.width || 1),
      'terrainStroke=' + String(packet && packet.terrainBoundaryStroke || ''),
      'terrainStrokeWidth=' + String(packet && packet.terrainBoundaryStrokeWidth || 0),
      'terrainMaterialId=' + String(packet && packet.terrainMaterialId || ''),
      'materialType=' + String(packet && packet.materialType || ''),
      'pattern=' + String(packet && packet.terrainMaterialLabel || '')
    ].join(';');
  }

  function packetInputSignature(packet, projected, options) {
    options = options || {};
    var cacheState = packet && packet.__lastStaticPacketCacheState || null;
    return [
      'packet=' + String(packet && packet.id || ''),
      'face=' + String(packet && packet.semanticFace || '') + '/' + String(packet && packet.screenFace || ''),
      'faceKey=' + String(packet && packet.faceKey || ''),
      'z=' + String(options.orderIndex != null ? options.orderIndex : ''),
      'depth=' + String(packet && packet.depthKey != null ? packet.depthKey : ''),
      'projectedKey=' + String(projected && projected.key || ''),
      'worldPts=' + String(Array.isArray(packet && packet.worldPts) ? packet.worldPts.length : 0),
      'worldLoops=' + String(Array.isArray(packet && packet.worldLoops) ? packet.worldLoops.length : 0),
      'overlays=' + String(cacheState && cacheState.overlayCount != null ? cacheState.overlayCount : (Array.isArray(projected && projected.overlaysNoCamera) ? projected.overlaysNoCamera.length : 0)),
      materialSignature(packet)
    ].join('|');
  }

  function beginFrame(meta, deps, context) {
    state.frameSeq += 1;
    var shared = getSharedFrameSnapshot();
    var faceMerge = getFaceMergeSnapshot();
    var visualViewRotation = toNumber(meta && (meta.visualViewRotation != null ? meta.visualViewRotation : meta.currentViewRotation), 0);
    var staticViewRotation = meta && meta.staticCacheViewRotation != null
      ? resolveStaticPacketViewRotationForStaticCache(meta.staticCacheViewRotation, deps)
      : resolveStaticPacketViewRotationForStaticCache(visualViewRotation, deps);
    var sharedFrameTextureVersion = meta && meta.staticSharedRenderFrameTextureVersion
      ? String(meta.staticSharedRenderFrameTextureVersion || '')
      : sanitizeStaticTextureVersionRotation(shared && shared.floorTextureVersion ? shared.floorTextureVersion : '', staticViewRotation);
    state.activeFrame = {
      step: STEP,
      phase: PHASE,
      frameSeq: state.frameSeq,
      framePlanId: String(meta && meta.framePlanId || (shared && shared.framePlanId) || 'frameplan:none'),
      viewRotation: staticViewRotation,
      visualViewRotation: visualViewRotation,
      staticCacheViewRotation: staticViewRotation,
      fractionalRotationInStaticCacheKey: Math.abs(staticViewRotation - Math.round(staticViewRotation)) > getStaticRotationSnapEpsilonForCache(),
      startedAt: nowMs(),
      deps: deps || null,
      context: context || null,
      faceMergeMode: faceMerge && faceMerge.effectiveFaceMergeMode ? String(faceMerge.effectiveFaceMergeMode) : '',
      pendingFaceMergeMode: faceMerge && faceMerge.pendingFaceMergeMode ? String(faceMerge.pendingFaceMergeMode) : '',
      sharedFrameId: shared && shared.frameId ? String(shared.frameId) : '',
      sharedFrameSurfaceRevision: shared && shared.floorSharedSurfaceRevision != null ? String(shared.floorSharedSurfaceRevision) : '',
      sharedFrameTextureVersion: sharedFrameTextureVersion,
      chunkSize: getChunkSize(deps),
      groups: Object.create(null),
      packetCount: 0
    };
    return state.activeFrame;
  }

  function acceptPacket(packet, projected, options) {
    var frame = state.activeFrame;
    if (!frame || !packet || packet.kind !== 'static-world-face-packet') return null;
    var chunkKey = inferChunkKey(packet, frame.deps) + '|band=' + inferStableDepthBand(packet);
    var group = frame.groups[chunkKey];
    if (!group) {
      group = frame.groups[chunkKey] = {
        chunkKey: chunkKey,
        stableDepthBand: inferStableDepthBand(packet),
        packetCount: 0,
        projectedKeyCount: 0,
        materialKeyCount: 0,
        minOrderIndex: Infinity,
        maxOrderIndex: -Infinity,
        packetSignatures: [],
        projectedKeys: Object.create(null),
        materialKeys: Object.create(null),
        samplePacketIds: []
      };
    }
    var orderIndex = Number(options && options.orderIndex);
    if (!Number.isFinite(orderIndex)) orderIndex = Number(options && options.runStartIndex || 0) + Number(options && options.packetIndex || 0);
    var projectedKey = String(projected && projected.key || 'projected:none');
    var matKey = materialSignature(packet);
    var sig = packetInputSignature(packet, projected, { orderIndex: orderIndex });
    group.packetCount += 1;
    frame.packetCount += 1;
    group.packetSignatures.push(sig);
    if (!group.projectedKeys[projectedKey]) { group.projectedKeys[projectedKey] = true; group.projectedKeyCount += 1; }
    if (!group.materialKeys[matKey]) { group.materialKeys[matKey] = true; group.materialKeyCount += 1; }
    group.minOrderIndex = Math.min(group.minOrderIndex, orderIndex);
    group.maxOrderIndex = Math.max(group.maxOrderIndex, orderIndex);
    if (group.samplePacketIds.length < 4) group.samplePacketIds.push(String(packet && packet.id || ''));
    return group;
  }

  function buildChunkSignature(frame, group) {
    return [
      'gpu-chunk-input-v=07.14K',
      'chunk=' + String(group.chunkKey),
      'stableDepthBand=' + String(group.stableDepthBand || ''),
      'viewRotation=' + safeRound(frame.viewRotation, 4),
      'faceMerge=' + String(frame.faceMergeMode || ''),
      'pendingFaceMerge=' + String(frame.pendingFaceMergeMode || ''),
      'packetCount=' + String(group.packetCount),
      'orderRange=' + String(group.minOrderIndex) + '-' + String(group.maxOrderIndex),
      'projectedKeyCount=' + String(group.projectedKeyCount),
      'materialKeyCount=' + String(group.materialKeyCount),
      'sharedFrameSurfaceRevision=' + String(frame.sharedFrameSurfaceRevision || ''),
      'sharedFrameTextureVersion=' + String(frame.sharedFrameTextureVersion || ''),
      'packets=' + group.packetSignatures.join('^')
    ].join('|');
  }

  function commitFrame(extra) {
    var frame = state.activeFrame;
    if (!frame) {
      state.lastSummary = { ok: false, step: STEP, phase: PHASE, reason: 'no-active-frame' };
      return state.lastSummary;
    }
    var chunkKeys = Object.keys(frame.groups).sort();
    var hitCount = 0;
    var missCount = 0;
    var changedCount = 0;
    var largestChunkKey = '';
    var largestChunkPacketCount = 0;
    var reusablePacketCount = 0;
    var rebuildPacketCount = 0;
    for (var i = 0; i < chunkKeys.length; i += 1) {
      var key = chunkKeys[i];
      var group = frame.groups[key];
      var signature = buildChunkSignature(frame, group);
      var cached = state.chunkCache[key] || null;
      var hit = !!(cached && cached.signature === signature);
      if (hit) {
        hitCount += 1;
        reusablePacketCount += group.packetCount;
      } else {
        missCount += 1;
        changedCount += cached ? 1 : 0;
        rebuildPacketCount += group.packetCount;
        state.chunkCache[key] = {
          signature: signature,
          packetCount: group.packetCount,
          projectedKeyCount: group.projectedKeyCount,
          materialKeyCount: group.materialKeyCount,
          minOrderIndex: group.minOrderIndex,
          maxOrderIndex: group.maxOrderIndex,
          lastUpdatedFrameSeq: frame.frameSeq,
          samplePacketIds: group.samplePacketIds.slice()
        };
      }
      if (group.packetCount > largestChunkPacketCount) {
        largestChunkPacketCount = group.packetCount;
        largestChunkKey = key;
      }
    }
    var wallMs = Math.max(0, nowMs() - frame.startedAt);
    state.lastSummary = Object.assign({
      ok: true,
      renderer: 'pixi-static-world-gpu-chunk-cache-input',
      step: STEP,
      phase: PHASE,
      diagnosticOnly: true,
      rendersNothing: true,
      consumesCanvas2dRasterOutput: false,
      consumesRendererNeutralPackets: true,
      frameSeq: frame.frameSeq,
      framePlanId: frame.framePlanId,
      chunkSize: frame.chunkSize,
      chunkCount: chunkKeys.length,
      chunkInputUsesStableDepthBands: true,
      stableDepthBandBucketSize: getStableDepthBandBucketSize(),
      staticPacketCount: frame.packetCount,
      chunkCacheHitCount: hitCount,
      chunkCacheMissCount: missCount,
      chunkCacheChangedCount: changedCount,
      chunkCacheHitRate: chunkKeys.length ? Number((hitCount / chunkKeys.length).toFixed(4)) : 0,
      chunkReusablePacketCount: reusablePacketCount,
      chunkRebuildCandidatePacketCount: rebuildPacketCount,
      largestChunkKey: largestChunkKey,
      largestChunkPacketCount: largestChunkPacketCount,
      avgPacketsPerChunk: chunkKeys.length ? Number((frame.packetCount / chunkKeys.length).toFixed(3)) : 0,
      sampleChunkKeys: chunkKeys.slice(0, 8),
      faceMergeMode: frame.faceMergeMode,
      sharedFrameId: frame.sharedFrameId,
      sharedFrameSurfaceRevision: frame.sharedFrameSurfaceRevision,
      sharedFrameTextureVersion: frame.sharedFrameTextureVersion,
      wallMs: Number(wallMs.toFixed ? wallMs.toFixed(3) : wallMs)
    }, extra || {});
    emit('summary', state.lastSummary);
    state.activeFrame = null;
    return state.lastSummary;
  }

  function getLastSummary() {
    return state.lastSummary || null;
  }

  function reset(reason) {
    state.activeFrame = null;
    state.chunkCache = Object.create(null);
    state.lastSummary = {
      ok: true,
      step: STEP,
      phase: PHASE,
      reset: true,
      reason: reason || 'reset'
    };
    emit('reset', state.lastSummary);
    return state.lastSummary;
  }

  var api = {
    owner: OWNER,
    step: STEP,
    phase: PHASE,
    beginFrame: beginFrame,
    acceptPacket: acceptPacket,
    commitFrame: commitFrame,
    getLastSummary: getLastSummary,
    reset: reset
  };

  global.__STATIC_WORLD_GPU_CHUNK_CACHE_INPUT__ = api;
  try {
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.staticWorldGpuChunkCacheInput', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
  global.App = global.App || {};
  global.App.renderer = global.App.renderer || {};
  global.App.renderer.optimization = global.App.renderer.optimization || {};
  global.App.renderer.optimization.staticWorldGpuChunkCacheInput = api;

  emit('ready', {
    ok: true,
    diagnosticOnly: true,
    consumesRendererNeutralPackets: true,
    consumesCanvas2dRasterOutput: false,
    source: 'module-load'
  });
})(typeof window !== 'undefined' ? window : globalThis);
