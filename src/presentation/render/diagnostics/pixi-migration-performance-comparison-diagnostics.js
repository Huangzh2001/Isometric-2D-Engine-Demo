// PXM-07.5: Canvas2D vs PixiJS performance comparison diagnostics.
// Layer: presentation/render/diagnostics.
//
// This module only records renderer timing samples for migration validation.
// It does not render, sort, pick, mutate world data, or own PixiJS/Canvas2D state.
(function registerPixiMigrationPerformanceComparisonDiagnostics(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/diagnostics/pixi-migration-performance-comparison-diagnostics.js';
  var STEP = 'PXM-07.5';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var STORAGE_KEY = 'isometric:pixi-migration:perf-summaries:v1';
  var DEFAULT_SAMPLE_FRAMES = 180;
  var MAX_STORED_SUMMARIES = 8;

  var state = {
    started: false,
    sampleSeq: 0,
    activeSample: null,
    lastStatusSignature: '',
    lastComparisonSignature: '',
    storedSummariesEmitted: false
  };

  function nowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    return Date.now();
  }

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : (fallback || 0);
  }

  function round(value) {
    var n = toNumber(value, 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function stringifyValue(value) {
    if (value == null) return String(value);
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    if (typeof value === 'string') return value.replace(/\s+/g, ' ');
    try { return JSON.stringify(value); } catch (_) { return '[unserializable]'; }
  }

  function formatPayload(payload) {
    if (!payload || typeof payload !== 'object') return '';
    return Object.keys(payload).map(function (key) {
      return String(key) + '=' + stringifyValue(payload[key]);
    }).join(' ');
  }

  function emit(section, payload) {
    var line = PREFIX + '[' + String(section || 'event') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function getBackendSnapshot() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') return selection.getSnapshot() || {};
    } catch (_) {}
    return {};
  }

  function normalizeBackend(value) {
    var name = String(value || '').trim().toLowerCase();
    if (name === 'pixijs' || name === 'pixi-js') return 'pixi';
    if (name === 'canvas' || name === 'canvas2d-renderer') return 'canvas2d';
    if (name === 'pixi' || name === 'canvas2d') return name;
    return 'canvas2d';
  }

  function getActiveBackend() {
    var snapshot = getBackendSnapshot();
    if (snapshot.activeBackend) return normalizeBackend(snapshot.activeBackend);
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return normalizeBackend(api.backend);
      return api ? 'registered-unknown' : 'missing';
    } catch (_) {}
    return 'unknown';
  }

  function readStoredSummaries() {
    try {
      if (!global.sessionStorage) return [];
      var raw = global.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (_) {}
    return [];
  }

  function writeStoredSummaries(next) {
    try {
      if (!global.sessionStorage) return false;
      var list = Array.isArray(next) ? next.slice(-MAX_STORED_SUMMARIES) : [];
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (_) {}
    return false;
  }

  function storeSummary(summary) {
    if (!summary || !summary.backend) return false;
    var list = readStoredSummaries();
    list.push(summary);
    return writeStoredSummaries(list);
  }

  function latestSummaryForBackend(backend) {
    var target = normalizeBackend(backend);
    var list = readStoredSummaries();
    for (var i = list.length - 1; i >= 0; i--) {
      if (normalizeBackend(list[i] && list[i].backend) === target) return list[i];
    }
    return null;
  }

  function percentile(values, pct) {
    if (!values || !values.length) return 0;
    var sorted = values.slice().sort(function (a, b) { return a - b; });
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1));
    return sorted[idx];
  }

  function summarizeValues(values) {
    var arr = (values || []).map(function (value) { return toNumber(value, 0); }).filter(function (value) { return Number.isFinite(value); });
    if (!arr.length) return { count: 0, avg: 0, p50: 0, p95: 0, min: 0, max: 0 };
    var sum = arr.reduce(function (acc, value) { return acc + value; }, 0);
    return {
      count: arr.length,
      avg: round(sum / arr.length),
      p50: round(percentile(arr, 50)),
      p95: round(percentile(arr, 95)),
      min: round(Math.min.apply(Math, arr)),
      max: round(Math.max.apply(Math, arr))
    };
  }

  function createBucket() {
    return {
      frameTotalMs: [],
      canvas2dPipelineTotalMs: [],
      canvas2dFallbackPipelineMs: [],
      canvas2dFallbackFrameMs: [],
      buildFramePlanMs: [],
      baseWorldPassesMs: [],
      drawRenderableOrderMs: [],
      drawOverlayPassesMs: [],
      drawHudPassMs: [],
      canvas2dFloorCanvasDrawMs: [],
      canvas2dFloorBlitMs: [],
      canvas2dFloorRebuildMs: [],
      canvas2dFloorTotalMs: [],
      pixiFloorDrawMs: [],
      renderableCount: [],
      visibleTiles: [],
      drawnTiles: []
    };
  }

  function pushValue(bucket, key, value) {
    if (!bucket || !bucket[key]) return;
    var n = Number(value);
    if (Number.isFinite(n)) bucket[key].push(n);
  }

  function sampleFrameCount(sample) {
    if (!sample) return 0;
    if (sample.backend === 'pixi') return sample.pixiFrames;
    return sample.canvas2dFrames;
  }

  function maybeEmitStart(reason) {
    if (state.started) return;
    state.started = true;
    emit('start', {
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      touchedFeature: 'canvas2d-vs-pixi-performance-comparison',
      active: getActiveBackend(),
      sampleActive: !!state.activeSample,
      source: reason || 'module-load'
    });
  }

  function emitStoredSummaries(reason) {
    if (state.storedSummariesEmitted) return;
    state.storedSummariesEmitted = true;
    var list = readStoredSummaries();
    if (!list.length) return;
    emit('stored-summary', {
      count: list.length,
      latestCanvas2dSampleId: latestSummaryForBackend('canvas2d') && latestSummaryForBackend('canvas2d').sampleId || 'none',
      latestPixiSampleId: latestSummaryForBackend('pixi') && latestSummaryForBackend('pixi').sampleId || 'none',
      source: reason || 'stored-summary'
    });
    emitComparison('stored-summary');
  }

  function beginSample(options) {
    maybeEmitStart('begin-sample');
    options = options || {};
    var active = getActiveBackend();
    var backend = normalizeBackend(options.backend || active || 'canvas2d');
    var maxFrames = Math.max(30, Math.min(600, Number(options.maxFrames || DEFAULT_SAMPLE_FRAMES)));
    var id = 'pxm075-' + (++state.sampleSeq) + '-' + Math.round(nowMs());
    state.activeSample = {
      id: id,
      backend: backend,
      requestedBackend: getBackendSnapshot().requestedBackend || backend,
      activeBackendAtStart: active,
      maxFrames: maxFrames,
      startedAt: nowMs(),
      source: options.source || 'manual',
      canvas2dFrames: 0,
      pixiFrames: 0,
      bucket: createBucket(),
      lastProgressAt: 0,
      finished: false
    };
    emit('perf-sample-start', {
      sampleId: id,
      backend: backend,
      active: active,
      maxFrames: maxFrames,
      requested: state.activeSample.requestedBackend,
      source: state.activeSample.source
    });
    emitStatus('begin-sample');
    return Object.assign({}, state.activeSample, { bucket: undefined });
  }

  function emitStatus(reason) {
    var active = getActiveBackend();
    var sample = state.activeSample || null;
    var signature = [active, sample && sample.id || 'none', sample && sample.backend || 'none', sampleFrameCount(sample), sample && sample.maxFrames || 0].join('|');
    if (signature === state.lastStatusSignature && reason !== 'force') return;
    state.lastStatusSignature = signature;
    emit('status', {
      active: active,
      sampleActive: !!sample,
      sampleId: sample && sample.id || 'none',
      sampleBackend: sample && sample.backend || 'none',
      frames: sampleFrameCount(sample),
      maxFrames: sample && sample.maxFrames || 0,
      canvas2dFallback: 'enabled',
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      source: reason || 'status'
    });
  }

  function noteProgress(sample, reason) {
    if (!sample) return;
    var frames = sampleFrameCount(sample);
    if (!frames) return;
    var current = nowMs();
    if (frames !== 1 && frames % 60 !== 0 && (current - Number(sample.lastProgressAt || 0)) < 2000) return;
    sample.lastProgressAt = current;
    emit('perf-sample-progress', {
      sampleId: sample.id,
      backend: sample.backend,
      frames: frames,
      maxFrames: sample.maxFrames,
      pct: round((frames / sample.maxFrames) * 100),
      source: reason || 'progress'
    });
  }

  function finishSample(reason) {
    var sample = state.activeSample;
    if (!sample || sample.finished) return null;
    sample.finished = true;
    var summary = buildSampleSummary(sample, reason || 'complete');
    storeSummary(summary);
    emit('perf-summary', summary);
    state.activeSample = null;
    emitComparison('sample-finished');
    emitStatus('force');
    return summary;
  }

  function maybeFinish(sample, reason) {
    if (!sample || sample.finished) return;
    if (sampleFrameCount(sample) >= sample.maxFrames) finishSample(reason || 'max-frames');
  }

  function buildSampleSummary(sample, reason) {
    var bucket = sample.bucket || createBucket();
    var frameTotal = sample.backend === 'pixi'
      ? summarizeValues(bucket.frameTotalMs)
      : summarizeValues(bucket.canvas2dPipelineTotalMs);
    var canvas2dPipeline = summarizeValues(bucket.canvas2dPipelineTotalMs);
    var canvas2dFallbackPipeline = summarizeValues(bucket.canvas2dFallbackPipelineMs);
    var canvas2dFallbackFrame = summarizeValues(bucket.canvas2dFallbackFrameMs);
    var pixiFloor = summarizeValues(bucket.pixiFloorDrawMs);
    var canvas2dFloorTotal = summarizeValues(bucket.canvas2dFloorTotalMs);
    var build = summarizeValues(bucket.buildFramePlanMs);
    var drawOrder = summarizeValues(bucket.drawRenderableOrderMs);
    var baseWorld = summarizeValues(bucket.baseWorldPassesMs);
    var overlays = summarizeValues(bucket.drawOverlayPassesMs);
    var hud = summarizeValues(bucket.drawHudPassMs);
    var visibleTiles = summarizeValues(bucket.visibleTiles);
    var drawnTiles = summarizeValues(bucket.drawnTiles);
    var renderables = summarizeValues(bucket.renderableCount);
    var durationMs = Math.max(0, nowMs() - sample.startedAt);
    return {
      sampleId: sample.id,
      backend: sample.backend,
      requested: sample.requestedBackend,
      activeAtStart: sample.activeBackendAtStart,
      frames: sampleFrameCount(sample),
      targetFrames: sample.maxFrames,
      durationMs: round(durationMs),
      reason: reason || 'complete',
      frameTotalAvgMs: frameTotal.avg,
      frameTotalP50Ms: frameTotal.p50,
      frameTotalP95Ms: frameTotal.p95,
      frameTotalMinMs: frameTotal.min,
      frameTotalMaxMs: frameTotal.max,
      canvas2dPipelineAvgMs: canvas2dPipeline.avg,
      canvas2dPipelineP50Ms: canvas2dPipeline.p50,
      canvas2dPipelineP95Ms: canvas2dPipeline.p95,
      canvas2dFallbackPipelineAvgMs: canvas2dFallbackPipeline.avg,
      canvas2dFallbackFrameAvgMs: canvas2dFallbackFrame.avg,
      buildFramePlanAvgMs: build.avg,
      baseWorldPassesAvgMs: baseWorld.avg,
      drawRenderableOrderAvgMs: drawOrder.avg,
      drawOverlayPassesAvgMs: overlays.avg,
      drawHudPassAvgMs: hud.avg,
      canvas2dFloorTotalAvgMs: canvas2dFloorTotal.avg,
      pixiFloorDrawAvgMs: pixiFloor.avg,
      visibleTilesAvg: visibleTiles.avg,
      drawnTilesAvg: drawnTiles.avg,
      renderableCountAvg: renderables.avg,
      fpsApproxFromFrameTotal: frameTotal.avg > 0 ? round(1000 / frameTotal.avg) : 0,
      pixiOwnsPointer: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      canvas2dFallback: 'enabled',
      source: 'pixi-migration-performance-comparison-diagnostics'
    };
  }

  function emitComparison(reason) {
    var canvas = latestSummaryForBackend('canvas2d');
    var pixi = latestSummaryForBackend('pixi');
    if (!canvas || !pixi) return null;
    var canvasFrame = toNumber(canvas.frameTotalAvgMs, 0);
    var pixiFrame = toNumber(pixi.frameTotalAvgMs, 0);
    var deltaMs = round(canvasFrame - pixiFrame);
    var deltaPct = canvasFrame > 0 ? round((deltaMs / canvasFrame) * 100) : 0;
    var valid = canvas.frames >= 30 && pixi.frames >= 30 && canvasFrame > 0 && pixiFrame > 0;
    var signature = [canvas.sampleId, pixi.sampleId, canvasFrame, pixiFrame].join('|');
    if (signature === state.lastComparisonSignature && reason !== 'force') return null;
    state.lastComparisonSignature = signature;
    return emit('comparison', {
      valid: valid,
      basis: 'sampled-frame-total-ms',
      canvas2dSampleId: canvas.sampleId,
      pixiSampleId: pixi.sampleId,
      canvas2dFrames: canvas.frames,
      pixiFrames: pixi.frames,
      canvas2dFrameAvgMs: canvasFrame,
      pixiFrameAvgMs: pixiFrame,
      deltaMs: deltaMs,
      deltaPct: deltaPct,
      fasterBackend: deltaMs > 0 ? 'pixi' : (deltaMs < 0 ? 'canvas2d' : 'tie'),
      canvas2dFloorTotalAvgMs: toNumber(canvas.canvas2dFloorTotalAvgMs, 0),
      pixiFloorDrawAvgMs: toNumber(pixi.pixiFloorDrawAvgMs, 0),
      canvas2dDrawOrderAvgMs: toNumber(canvas.drawRenderableOrderAvgMs, 0),
      pixiFallbackDrawOrderAvgMs: toNumber(pixi.drawRenderableOrderAvgMs, 0),
      warning: valid ? '' : 'insufficient-samples-or-missing-frame-total',
      source: reason || 'comparison'
    });
  }

  function noteCanvas2dPipeline(payload) {
    var sample = state.activeSample;
    if (!sample || sample.finished) return;
    payload = payload || {};
    var active = getActiveBackend();
    var bucket = sample.bucket;
    var pipelineTotal = toNumber(payload.totalPipelineMs || payload.runFramePipelineWallMs, 0);
    var floorCanvasDraw = toNumber(payload.baseWorldPassesFloorCanvasDrawWallMs, 0);
    var floorBlit = toNumber(payload.floorLayerBlitWallMs, 0);
    var floorRebuild = toNumber(payload.floorLayerRebuildWallMs, 0);
    var floorTotal = floorCanvasDraw + floorBlit + floorRebuild;

    if (sample.backend === 'canvas2d' && active === 'canvas2d') {
      sample.canvas2dFrames += 1;
      pushValue(bucket, 'canvas2dPipelineTotalMs', pipelineTotal);
      pushValue(bucket, 'frameTotalMs', pipelineTotal);
      pushValue(bucket, 'canvas2dFloorCanvasDrawMs', floorCanvasDraw);
      pushValue(bucket, 'canvas2dFloorBlitMs', floorBlit);
      pushValue(bucket, 'canvas2dFloorRebuildMs', floorRebuild);
      pushValue(bucket, 'canvas2dFloorTotalMs', floorTotal);
      pushCommonCanvas2dPayload(bucket, payload);
      noteProgress(sample, 'canvas2d-pipeline');
      maybeFinish(sample, 'canvas2d-sample-complete');
      return;
    }

    if (sample.backend === 'pixi' && active === 'pixi') {
      pushValue(bucket, 'canvas2dFallbackPipelineMs', pipelineTotal);
      pushValue(bucket, 'canvas2dPipelineTotalMs', pipelineTotal);
      pushCommonCanvas2dPayload(bucket, payload);
    }
  }

  function pushCommonCanvas2dPayload(bucket, payload) {
    pushValue(bucket, 'buildFramePlanMs', payload.buildFramePlanMs);
    pushValue(bucket, 'baseWorldPassesMs', payload.baseWorldPassesMs);
    pushValue(bucket, 'drawRenderableOrderMs', payload.drawRenderableOrderMs);
    pushValue(bucket, 'drawOverlayPassesMs', payload.drawOverlayPassesMs);
    pushValue(bucket, 'drawHudPassMs', payload.drawHudPassMs);
    pushValue(bucket, 'renderableCount', payload.renderableCount);
  }

  function notePixiFrame(payload) {
    var sample = state.activeSample;
    if (!sample || sample.finished || sample.backend !== 'pixi') return;
    payload = payload || {};
    var active = getActiveBackend();
    if (active !== 'pixi') return;
    var bucket = sample.bucket;
    sample.pixiFrames += 1;
    pushValue(bucket, 'frameTotalMs', payload.frameTotalMs || payload.pixiFrameTotalMs);
    pushValue(bucket, 'pixiFloorDrawMs', payload.pixiFloorDrawMs);
    pushValue(bucket, 'canvas2dFallbackFrameMs', payload.canvas2dFallbackFrameMs);
    pushValue(bucket, 'visibleTiles', payload.visibleTiles);
    pushValue(bucket, 'drawnTiles', payload.drawnTiles);
    pushValue(bucket, 'renderableCount', payload.renderableCount);
    noteProgress(sample, 'pixi-frame');
    maybeFinish(sample, 'pixi-sample-complete');
  }

  function cancelSample(reason) {
    if (!state.activeSample) return null;
    var sample = state.activeSample;
    state.activeSample = null;
    emit('perf-sample-cancelled', {
      sampleId: sample.id,
      backend: sample.backend,
      frames: sampleFrameCount(sample),
      reason: reason || 'cancelled'
    });
    emitStatus('force');
    return sample.id;
  }

  function getStatus() {
    var sample = state.activeSample;
    return {
      step: STEP,
      owner: OWNER,
      layer: 'presentation/render/diagnostics',
      activeBackend: getActiveBackend(),
      sampleActive: !!sample,
      sampleId: sample && sample.id || null,
      sampleBackend: sample && sample.backend || null,
      sampleFrames: sampleFrameCount(sample),
      sampleTargetFrames: sample && sample.maxFrames || 0,
      storedSummaries: readStoredSummaries().length,
      canvas2dSummaryAvailable: !!latestSummaryForBackend('canvas2d'),
      pixiSummaryAvailable: !!latestSummaryForBackend('pixi'),
      ownsPointer: false,
      ownsPicking: false,
      mutatesBusinessObjects: false
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    beginSample: beginSample,
    cancelSample: cancelSample,
    finishSample: finishSample,
    noteCanvas2dPipeline: noteCanvas2dPipeline,
    notePixiFrame: notePixiFrame,
    emitComparison: function () { return emitComparison('manual'); },
    getStatus: getStatus
  };

  try {
    global.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__ = api;
    global.App = global.App || {};
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.diagnostics = global.App.presentation.render.diagnostics || {};
    global.App.presentation.render.diagnostics.pixiMigrationPerformanceComparison = api;
  } catch (_) {}

  maybeEmitStart('module-load');
  emitStoredSummaries('module-load');
  emitStatus('module-load');
})(typeof window !== 'undefined' ? window : globalThis);
