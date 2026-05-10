// PXM-07.12A: PixiJS interleaved framePlan renderer skeleton.
// Layer: presentation/render/renderer.
//
// This module is intentionally a skeleton: it reads the engine-owned
// framePlan.order and builds an interleaved Pixi render plan without changing
// visual ownership yet. It prevents another type-layer migration by making
// framePlan.order the only source of future Pixi world rendering order.
(function registerPixiInterleavedFramePlanRenderer(global) {
  if (!global) return;

  var STEP = 'PXM-07.12A';
  var OWNER = 'src/presentation/render/renderer/pixi-interleaved-frameplan-renderer.js';
  var PHASE = 'pixi-interleaved-frameplan-renderer-skeleton';

  var state = {
    started: false,
    lastFramePlan: null,
    lastFramePlanMeta: null,
    lastFramePlanSummary: null,
    lastRenderPlanSummary: null,
    lastRenderFrameSummary: null,
    framePlanSeq: 0,
    renderFrameSeq: 0
  };

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function getDiag() {
    try { return global.__PIXI_MIGRATION_PIXI_INTERLEAVED_FRAMEPLAN_SKELETON_DIAGNOSTICS__ || null; } catch (_) {}
    return null;
  }

  function emitDiag(method, payload, options) {
    try {
      var diag = getDiag();
      if (diag && typeof diag[method] === 'function') return diag[method](payload || {}, options || {});
    } catch (_) {}
    return payload || {};
  }

  function getActiveBackend() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') {
        var snapshot = selection.getSnapshot() || {};
        if (snapshot.activeBackend) return String(snapshot.activeBackend);
      }
    } catch (_) {}
    return 'unknown';
  }

  function bindPath(path, value, meta) {
    try {
      if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
        return global.__APP_NAMESPACE.bind(path, value, meta || {});
      }
    } catch (_) {}
    return value;
  }

  function maybeStart(source) {
    if (state.started) return;
    state.started = true;
    emitDiag('noteInterleavedSummary', {
      section: 'start',
      owner: OWNER,
      phase: PHASE,
      activeBackend: getActiveBackend(),
      readsFramePlanOrder: true,
      visualAdoption: false,
      canvas2dSkip: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      source: source || 'module-load'
    }, { force: true });
  }

  function getRenderableKind(renderable) {
    if (!renderable) return 'unknown';
    if (renderable.kind) return String(renderable.kind);
    if (renderable.id === 'player-avatar') return 'player-avatar';
    if (renderable.type) return String(renderable.type);
    return 'unknown';
  }

  function getRenderableId(renderable) {
    if (!renderable) return '';
    return String(renderable.id || renderable.renderableId || renderable.instanceId || renderable.prefabId || '');
  }

  function isPixiCandidateKind(kind) {
    return kind === 'static-world-face-packet' || kind === 'player-avatar' || kind === 'prefab-sprite';
  }

  function isDynamicKind(kind) {
    return kind === 'player-avatar' || kind === 'actor' || kind === 'prefab-sprite' || kind === 'prefab-sprite-part' || kind === 'object' || kind === 'sprite';
  }

  function makeStaticRunSegments(order) {
    var segments = [];
    var current = null;
    var firstDynamicIndex = -1;
    for (var i = 0; i < order.length; i++) {
      var kind = getRenderableKind(order[i]);
      if (firstDynamicIndex < 0 && isDynamicKind(kind) && kind !== 'static-world-face-packet') firstDynamicIndex = i;
      if (kind === 'static-world-face-packet') {
        if (!current) {
          current = {
            startIndex: i,
            endExclusive: i,
            packetCount: 0,
            firstPacketId: getRenderableId(order[i]),
            lastPacketId: getRenderableId(order[i])
          };
          segments.push(current);
        }
        current.endExclusive = i + 1;
        current.packetCount += 1;
        current.lastPacketId = getRenderableId(order[i]);
      } else {
        current = null;
      }
    }
    for (var j = 0; j < segments.length; j++) {
      var seg = segments[j];
      seg.firstDynamicIndex = firstDynamicIndex;
      seg.beforeFirstDynamic = firstDynamicIndex < 0 || seg.endExclusive <= firstDynamicIndex;
      seg.afterFirstDynamic = firstDynamicIndex >= 0 && seg.startIndex >= firstDynamicIndex;
      seg.crossesFirstDynamic = firstDynamicIndex >= 0 && seg.startIndex < firstDynamicIndex && seg.endExclusive > firstDynamicIndex;
      seg.prefixSafe = seg.startIndex === 0 && seg.beforeFirstDynamic;
    }
    return segments;
  }

  function summarizeFramePlan(framePlan, meta) {
    var order = framePlan && Array.isArray(framePlan.order) ? framePlan.order : [];
    var kindCounts = Object.create(null);
    var candidateKinds = Object.create(null);
    var fallbackKinds = Object.create(null);
    var supportedCandidateCount = 0;
    var dynamicCandidateCount = 0;
    var unsupportedCount = 0;
    var firstDynamicIndex = -1;
    var firstUnsupportedSample = [];
    for (var i = 0; i < order.length; i++) {
      var kind = getRenderableKind(order[i]);
      kindCounts[kind] = (kindCounts[kind] || 0) + 1;
      if (firstDynamicIndex < 0 && isDynamicKind(kind) && kind !== 'static-world-face-packet') firstDynamicIndex = i;
      if (isPixiCandidateKind(kind)) {
        supportedCandidateCount += 1;
        candidateKinds[kind] = (candidateKinds[kind] || 0) + 1;
        if (kind !== 'static-world-face-packet') dynamicCandidateCount += 1;
      } else {
        unsupportedCount += 1;
        fallbackKinds[kind] = (fallbackKinds[kind] || 0) + 1;
        if (firstUnsupportedSample.length < 8) firstUnsupportedSample.push({ index: i, kind: kind, id: getRenderableId(order[i]) });
      }
    }
    var staticRunSegments = makeStaticRunSegments(order);
    var prefixSafeCount = 0;
    var interleavedStaticSegmentCount = 0;
    for (var s = 0; s < staticRunSegments.length; s++) {
      if (staticRunSegments[s].prefixSafe) prefixSafeCount += 1;
      if (!staticRunSegments[s].prefixSafe) interleavedStaticSegmentCount += 1;
    }
    return {
      framePlanId: framePlan && framePlan.id || '',
      framePlanSignature: framePlan && framePlan.signature || '',
      currentViewRotation: framePlan && framePlan.currentViewRotation != null ? framePlan.currentViewRotation : null,
      orderCount: order.length,
      kindCounts: kindCounts,
      pixiCandidateKinds: candidateKinds,
      fallbackKinds: fallbackKinds,
      supportedCandidateCount: supportedCandidateCount,
      dynamicCandidateCount: dynamicCandidateCount,
      unsupportedCount: unsupportedCount,
      firstDynamicIndex: firstDynamicIndex,
      staticRunSegmentCount: staticRunSegments.length,
      prefixSafeStaticRunSegmentCount: prefixSafeCount,
      interleavedStaticRunSegmentCount: interleavedStaticSegmentCount,
      sampleStaticRunSegments: staticRunSegments.slice(0, 8),
      firstUnsupportedSample: firstUnsupportedSample,
      readsFramePlanOrder: true,
      orderPreserved: true,
      visualAdoption: false,
      canvas2dSkip: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      source: meta && meta.source || 'pixi-interleaved-note-frameplan'
    };
  }

  function noteFramePlan(framePlan, meta) {
    maybeStart(meta && meta.source || 'note-frame-plan');
    state.framePlanSeq += 1;
    state.lastFramePlan = framePlan || null;
    state.lastFramePlanMeta = meta || null;
    var summary = summarizeFramePlan(framePlan, meta || {});
    summary.framePlanSeq = state.framePlanSeq;
    state.lastFramePlanSummary = summary;
    emitDiag('noteInterleavedFramePlan', Object.assign({
      activeBackend: getActiveBackend(),
      pixiInterleavedRendererSkeleton: true,
      framePlanOrderIsSourceOfTruth: true,
      typeLayerAdoptionDisabled: true
    }, summary), { intervalMs: 1200 });
    return framePlan;
  }

  function buildRenderPlan(options) {
    options = options || {};
    var framePlan = options.framePlan || state.lastFramePlan || null;
    var summary = summarizeFramePlan(framePlan, { source: options.source || 'pixi-interleaved-build-render-plan' });
    var plan = {
      step: STEP,
      phase: PHASE,
      framePlan: framePlan,
      framePlanId: summary.framePlanId,
      orderCount: summary.orderCount,
      readsFramePlanOrder: true,
      orderPreserved: true,
      visualAdoption: false,
      canvas2dSkip: false,
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      supportedCandidateCount: summary.supportedCandidateCount,
      unsupportedCount: summary.unsupportedCount,
      staticRunSegmentCount: summary.staticRunSegmentCount,
      prefixSafeStaticRunSegmentCount: summary.prefixSafeStaticRunSegmentCount,
      interleavedStaticRunSegmentCount: summary.interleavedStaticRunSegmentCount,
      reason: 'skeleton-only-no-visual-adoption'
    };
    state.lastRenderPlanSummary = Object.assign({}, summary, {
      pixiInterleavedRendererSkeleton: true,
      renderPlanBuilt: true,
      visualAdoption: false,
      canvas2dSkip: false,
      reason: plan.reason,
      source: options.source || 'pixi-interleaved-build-render-plan'
    });
    emitDiag('noteInterleavedRenderPlan', Object.assign({
      activeBackend: getActiveBackend(),
      framePlanOrderIsSourceOfTruth: true,
      pixiWorldRendererMode: 'interleaved-frameplan-skeleton',
      typeLayerAdoptionDisabled: true,
      canvas2dFallback: 'enabled-for-all-world-renderables-except-floor'
    }, state.lastRenderPlanSummary), { intervalMs: 1200 });
    return plan;
  }

  function notePixiRenderFrame(options) {
    maybeStart(options && options.source || 'pixi-render-frame');
    state.renderFrameSeq += 1;
    var plan = buildRenderPlan({ source: options && options.source || 'pixi-render-frame', framePlan: options && options.framePlan || null });
    var payload = {
      activeBackend: getActiveBackend(),
      framePlanId: plan.framePlanId,
      renderFrameSeq: state.renderFrameSeq,
      pixiInterleavedRendererSkeleton: true,
      framePlanOrderIsSourceOfTruth: true,
      readsFramePlanOrder: true,
      renderPlanBuilt: true,
      visualAdoption: false,
      canvas2dSkip: false,
      typeLayerAdoptionDisabled: true,
      migratedWorldKindsDrawnByPixi: 'floor-only',
      unsupportedWorldRenderablesStayCanvas2d: true,
      canvas2dFallback: 'enabled',
      modifiesRendering: false,
      changesDepthSort: false,
      changesPicking: false,
      pixiOwnsPicking: false,
      pixiSortChildren: false,
      pixiZIndexUsed: false,
      orderCount: plan.orderCount,
      supportedCandidateCount: plan.supportedCandidateCount,
      unsupportedCount: plan.unsupportedCount,
      staticRunSegmentCount: plan.staticRunSegmentCount,
      prefixSafeStaticRunSegmentCount: plan.prefixSafeStaticRunSegmentCount,
      interleavedStaticRunSegmentCount: plan.interleavedStaticRunSegmentCount,
      source: options && options.source || 'pixi-render-frame'
    };
    state.lastRenderFrameSummary = payload;
    emitDiag('noteInterleavedOwnership', payload, { intervalMs: 1200 });
    emitDiag('noteInterleavedSummary', Object.assign({ ok: true }, payload), { intervalMs: 1200 });
    return payload;
  }

  function getStatus() {
    return {
      step: STEP,
      phase: PHASE,
      owner: OWNER,
      framePlanSeq: state.framePlanSeq,
      renderFrameSeq: state.renderFrameSeq,
      lastFramePlanSummary: state.lastFramePlanSummary,
      lastRenderPlanSummary: state.lastRenderPlanSummary,
      lastRenderFrameSummary: state.lastRenderFrameSummary,
      visualAdoption: false,
      canvas2dSkip: false,
      readsFramePlanOrder: true
    };
  }

  var api = {
    step: STEP,
    phase: PHASE,
    owner: OWNER,
    noteFramePlan: noteFramePlan,
    buildRenderPlan: buildRenderPlan,
    notePixiRenderFrame: notePixiRenderFrame,
    getStatus: getStatus
  };

  maybeStart('module-load');
  global.__PIXI_INTERLEAVED_FRAMEPLAN_RENDERER__ = api;
  global.__PIXI_WORLD_INTERLEAVED_FRAMEPLAN_RENDERER__ = api;
  try { bindPath('renderer.pixiInterleavedFramePlanRenderer', api, { owner: OWNER, phase: PHASE }); } catch (_) {}
})(typeof window !== 'undefined' ? window : globalThis);
