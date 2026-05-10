// PXM-07.6C: Shared optimization runtime manifest for PixiJS migration.
// Layer: presentation/render/optimization.
//
// This file is a read-only design/runtime manifest. It does not render,
// mutate caches, select a backend, or change Canvas2D/PixiJS behavior. It
// turns the existing shared optimization contracts into explicit interface
// boundaries so later implementation steps can be small and safe.
(function registerSharedRenderOptimizationRuntimeManifest(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-runtime-manifest.js';
  var PHASE = 'shared-render-optimization-runtime-manifest';

  var NEXT_IMPLEMENTATION_ORDER = [
    'floor-layer-cache-shared-consumer',
    'static-packet-run-cache-shared-consumer',
    'projected-geometry-generic-payload-split'
  ];

  var MANIFEST_OVERRIDES = {
    'floor-layer-cache': {
      sharedSource: 'floor layer dirty/version/signature plus chunk-level cached floor surface',
      consumerSpecificPayload: {
        canvas2d: 'floorLayerCanvas + chunk canvases + drawImage blit',
        pixi: 'future Texture/RenderTexture/Sprite consumer of the same dirty/cache payload'
      },
      dirtyVersionSignature: 'floor content signature, viewRotation, tile appearance/material settings, visible chunk keys, floor layer bounds',
      runtimeStats: 'floorVisibleChunkCount, floorBuiltChunkCountThisFrame, floorMissingChunkCountBefore/After, floorLayerRebuildWallMs, floorLayerBlitWallMs, pixiFloorDrawWallMs',
      fallbackPolicy: 'If shared Pixi consumer is unavailable or texture update fails, keep Canvas2D floor fallback enabled; never disable Canvas2D full fallback.',
      implementationReadiness: 'design-only-consumer-missing',
      nextAction: 'create shared floor cache consumer boundary before replacing Pixi first-pass redraw',
      riskGate: 'Do not allow PixiJS to redraw all floor tiles every frame after the shared consumer step.'
    },
    'static-world-chunk-cache': {
      sharedSource: 'cached world-face-packets grouped by static world chunks',
      consumerSpecificPayload: {
        canvas2d: 'framePlan.order static-world-face-packet runs',
        pixi: 'future static-face/run consumer must read the same packet lists'
      },
      dirtyVersionSignature: 'scene cache version, dirty chunk keys, viewRotation, render signature, occupancy snapshot version',
      runtimeStats: 'visibleChunkCount, rebuiltChunkCountThisFrame, reusedChunkCountThisFrame, dirtyChunkCount, visibleStaticPacketCount, staticCacheBuildMs',
      fallbackPolicy: 'If Pixi static consumer is unavailable, Canvas2D fallback continues consuming framePlan.order.',
      implementationReadiness: 'already-shared-source',
      nextAction: 'preserve as source of truth for PXM-08 static rendering',
      riskGate: 'Do not rebuild static world from boxes in PixiJS.'
    },
    'static-packet-run-cache': {
      sharedSource: 'consecutive static-world-face-packet run plus run signature and bounds',
      consumerSpecificPayload: {
        canvas2d: 'offscreen bitmap canvas run cache',
        pixi: 'future RenderTexture/Texture/Sprite run cache or safe bridge from shared run payload'
      },
      dirtyVersionSignature: 'run signature, order hash, packet ids/geometry/material signature, viewRotation, camera-independent bounds',
      runtimeStats: 'staticBitmapRunCount, staticBitmapRunPacketCount, staticBitmapRunCacheHitCount, staticBitmapRunCacheMissCount, staticBitmapRunBuildMs, staticBitmapRunDrawMs',
      fallbackPolicy: 'If Pixi run cache is unavailable, preserve Canvas2D static run fallback; do not degrade to Pixi per-packet redraw without explicit profiling gate.',
      implementationReadiness: 'design-only-consumer-missing',
      nextAction: 'define shared static packet run consumer before Pixi static-face migration',
      riskGate: 'Do not migrate static-world-face-packet to PixiJS by drawing hundreds of Graphics one by one each frame.'
    },
    'projected-geometry-cache': {
      sharedSource: 'generic projected points/loops/segments/overlays separated from Canvas2D Path2D derivatives',
      consumerSpecificPayload: {
        canvas2d: 'generic projected geometry + Path2D/strokePath2D/terrainBoundaryPath2D derivatives',
        pixi: 'future Graphics/Geometry derivative generated from the same generic projected geometry'
      },
      dirtyVersionSignature: 'packet world geometry signature, viewRotation, projection signature, material/overlay signature',
      runtimeStats: 'staticPacketGeometryCacheHitCount, staticPacketGeometryCacheMissCount, staticPacketOverlayCacheHitCount, staticPacketOverlayCacheMissCount',
      fallbackPolicy: 'If generic payload split is incomplete, keep Canvas2D Path2D consumer as fallback and block Pixi static-face migration.',
      implementationReadiness: 'split-required',
      nextAction: 'split generic projected payload from Canvas2D Path2D cache before Pixi static-face implementation',
      riskGate: 'Do not duplicate projection math in PixiJS consumer.'
    },
    'material-color-cache': {
      sharedSource: 'packet material/color fields generated by static world builder',
      consumerSpecificPayload: {
        canvas2d: 'packet.fill/packet.stroke CSS color strings',
        pixi: 'future conversion of packet color fields to Pixi fill/stroke values without recalculating material logic'
      },
      dirtyVersionSignature: 'material settings, lighting signature, color mode, viewRotation if relevant',
      runtimeStats: 'colorCacheHitCount, colorCacheMissCount, step4BuildColorMs',
      fallbackPolicy: 'If Pixi color conversion fails, keep Canvas2D packet draw fallback; do not recalculate colors in Pixi business path.',
      implementationReadiness: 'already-shared-source',
      nextAction: 'treat packet color fields as source of truth for future Pixi consumers',
      riskGate: 'Do not recompute material/color in PixiJS renderer.'
    },
    'shadow-overlay-cache': {
      sharedSource: 'shadowOverlaysWorld and projected overlay payload when shadow/light path is active',
      consumerSpecificPayload: {
        canvas2d: 'Canvas2D shadow overlay draw pass',
        pixi: 'future overlay Graphics/RenderTexture consumer'
      },
      dirtyVersionSignature: 'lighting signature, shadow settings, packet geometry signature, viewRotation',
      runtimeStats: 'shadowOverlayCacheHitCount, shadowOverlayCacheMissCount, shadowOverlayTotalCount, step4ShadowOverlayTotalMs',
      fallbackPolicy: 'If shadow shared source is not observed, leave shadow migration disabled; keep Canvas2D shadow fallback.',
      implementationReadiness: 'conditional-source',
      nextAction: 'validate in a shadow-active scene before Pixi shadow migration',
      riskGate: 'Do not infer shadow performance from non-shadow scenes.'
    },
    'visibility-culling-contract': {
      sharedSource: 'camera scope and visibility/culling result generated before backend draw',
      consumerSpecificPayload: {
        canvas2d: 'filtered framePlan.order and visible renderables',
        pixi: 'same filtered framePlan.order and visible renderables'
      },
      dirtyVersionSignature: 'camera position, zoom, culling margin, viewport size, viewRotation',
      runtimeStats: 'renderablesBeforeCulling, renderablesAfterCulling, culledByCameraCount, visibilityFilterMs',
      fallbackPolicy: 'If visibility scope is missing, keep legacy Canvas2D path; PixiJS must not invent a separate culling rule.',
      implementationReadiness: 'already-shared-source',
      nextAction: 'preserve as required input for every Pixi consumer',
      riskGate: 'Do not use Pixi viewport/hitArea as business culling source.'
    },
    'occupancy-cache-contract': {
      sharedSource: 'scene occupancy snapshot and cache version',
      consumerSpecificPayload: {
        canvas2d: 'render builders consume occupancy snapshot',
        pixi: 'indirect through cached render payloads; future direct consumers must read snapshot only'
      },
      dirtyVersionSignature: 'occupancy cache version and scene mutation version',
      runtimeStats: 'occupancyCacheActive, occupancyCacheVersion, occupancyRebuiltThisFrame',
      fallbackPolicy: 'If occupancy snapshot is unavailable, preserve existing scene/render fallback; do not rebuild occupancy in PixiJS.',
      implementationReadiness: 'already-shared-source',
      nextAction: 'keep occupancy as upstream source only',
      riskGate: 'Do not rebuild occupancy per frame in renderer backend.'
    },
    'interaction-fast-path-contract': {
      sharedSource: 'fast path frame order and interaction preview state',
      consumerSpecificPayload: {
        canvas2d: 'player move fast-path order and Canvas2D zoom preview snapshot',
        pixi: 'future Pixi consumer must respect fast-path order; preview requires later shared snapshot/RenderTexture contract'
      },
      dirtyVersionSignature: 'player/camera/interaction state, static chunk signature, zoom settle state',
      runtimeStats: 'playerMoveFastPathUsed, playerMoveFastPathRejectReasons, zoomPreviewFastPathUsed, zoomPreviewDrawMs',
      fallbackPolicy: 'If Pixi preview consumer is missing, keep Canvas2D preview/fallback; do not disable existing fast paths.',
      implementationReadiness: 'partially-shared-frame-order',
      nextAction: 'preserve fast-path framePlan.order before actor/player Pixi migration',
      riskGate: 'Do not bypass player move fast-path when introducing Pixi sprites.'
    },
    'performance-audit-contract': {
      sharedSource: 'frame/cache/backend performance samples with comparable field names',
      consumerSpecificPayload: {
        canvas2d: 'pipeline timing and Canvas draw loop breakdown',
        pixi: 'Pixi consumer timing plus Canvas2D fallback timing where mixed backend is active'
      },
      dirtyVersionSignature: 'sample id, backend, target frame count, scene/render signature',
      runtimeStats: 'frameTotalAvgMs, canvas2dPipelineAvgMs, pixiFloorDrawAvgMs, cache hit/miss fields',
      fallbackPolicy: 'If comparable metrics are unavailable, do not claim performance improvement.',
      implementationReadiness: 'already-shared-diagnostics',
      nextAction: 'require every future Pixi consumer to publish comparable timing/cache stats',
      riskGate: 'No performance claim without Canvas2D and Pixi summaries from the same scene class.'
    }
  };

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function getContractsApi() {
    return global.__SHARED_RENDER_OPTIMIZATION_CONTRACTS__ || null;
  }

  function listBaseContracts() {
    var api = getContractsApi();
    if (api && typeof api.listContracts === 'function') {
      try { return api.listContracts() || []; } catch (_) {}
    }
    return [];
  }

  function buildInterfaceRow(contract) {
    contract = contract || {};
    var override = MANIFEST_OVERRIDES[contract.id] || {};
    return {
      id: contract.id || 'unknown',
      name: contract.name || contract.id || 'unknown',
      sourceStatus: contract.sourceStatus || 'unknown',
      sharedSource: override.sharedSource || (contract.sourcePayload || []).join(',') || 'unspecified',
      consumerSpecificPayload: clone(override.consumerSpecificPayload || {
        canvas2d: contract.canvas2dConsumer && (contract.canvas2dConsumer.consumes || []).join(',') || 'unspecified',
        pixi: contract.pixiConsumer && contract.pixiConsumer.target || 'unspecified'
      }),
      dirtyVersionSignature: override.dirtyVersionSignature || 'unspecified',
      runtimeStats: override.runtimeStats || 'unspecified',
      canvas2dConsumer: clone(contract.canvas2dConsumer || { status: 'unknown' }),
      pixiConsumer: clone(contract.pixiConsumer || { status: 'unknown' }),
      fallbackPolicy: override.fallbackPolicy || 'Keep Canvas2D fallback enabled.',
      implementationReadiness: override.implementationReadiness || contract.sourceStatus || 'unknown',
      nextAction: override.nextAction || contract.reuseRule || 'review-before-implementation',
      riskGate: override.riskGate || contract.migrationRisk || 'review-required'
    };
  }

  function listRuntimeManifest() {
    return listBaseContracts().map(buildInterfaceRow);
  }

  function getContractInterface(id) {
    var rows = listRuntimeManifest();
    for (var i = 0; i < rows.length; i++) if (rows[i].id === id) return clone(rows[i]);
    return null;
  }

  function getImplementationOrder() {
    return NEXT_IMPLEMENTATION_ORDER.slice();
  }

  function summarizeRuntimeManifest() {
    var rows = listRuntimeManifest();
    var summary = {
      total: rows.length,
      modifiesRendering: false,
      canvas2dBehaviorChanged: false,
      pixiBehaviorChanged: false,
      implementsPixiCacheBridge: false,
      nextImplementationOrder: getImplementationOrder(),
      sharedSourceCount: 0,
      splitRequiredCount: 0,
      consumerMissingCount: 0,
      highRiskCount: 0
    };
    rows.forEach(function (row) {
      if (/shared|already/.test(String(row.sourceStatus || row.implementationReadiness || ''))) summary.sharedSourceCount += 1;
      if (/split/.test(String(row.sourceStatus || row.implementationReadiness || ''))) summary.splitRequiredCount += 1;
      if (row.pixiConsumer && /missing|future/.test(String(row.pixiConsumer.status || ''))) summary.consumerMissingCount += 1;
      if (/high|very-high|Do not/.test(String(row.riskGate || ''))) summary.highRiskCount += 1;
    });
    return summary;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    listRuntimeManifest: listRuntimeManifest,
    getContractInterface: getContractInterface,
    getImplementationOrder: getImplementationOrder,
    summarizeRuntimeManifest: summarizeRuntimeManifest
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_RUNTIME_MANIFEST__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.sharedRuntimeManifest', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.sharedRuntimeManifest = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_RUNTIME_MANIFEST__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
