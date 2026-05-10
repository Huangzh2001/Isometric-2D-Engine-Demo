// PXM-07.6B: Shared render optimization contracts for PixiJS migration.
// Layer: presentation/render/optimization.
//
// This file is a renderer-neutral contract manifest. It does not render,
// mutate scene data, change cache behavior, or select a renderer. It records
// which optimization sources should be shared by Canvas2D and PixiJS consumers.
(function registerSharedRenderOptimizationContracts(global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/optimization/shared-render-optimization-contracts.js';
  var PHASE = 'shared-render-optimization-contracts';

  var CONTRACTS = [
    {
      id: 'floor-layer-cache',
      name: 'Shared floor layer cache',
      sourceStatus: 'shared-source-required',
      sourceLayer: 'presentation/render',
      sourceModules: [
        'src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js',
        'src/presentation/render/render.js'
      ],
      sourcePayload: [
        'floor dirty/content signature',
        'visible floor chunk keys',
        'floor chunk entries',
        'floor layer bounds',
        'floor layer canvas or equivalent cached surface'
      ],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-floor-layer-draw-pass.js'],
        consumes: ['floorLayerCanvas', 'chunk entry canvases', 'drawImage blit']
      },
      pixiConsumer: {
        status: 'missing',
        current: 'PXM-07 PixiJS floor first pass redraws tiles with Graphics',
        target: 'Consume the same shared floor cache payload through Texture/RenderTexture/Sprite without changing dirty semantics'
      },
      migrationRisk: 'high-if-bypassed',
      reuseRule: 'Do not redraw tiles every frame in PixiJS; reuse the same dirty/cache/chunk contract first.'
    },
    {
      id: 'static-world-chunk-cache',
      name: 'Shared static world chunk cache',
      sourceStatus: 'already-shared-source',
      sourceLayer: 'application/render + presentation/render cache payload',
      sourceModules: [
        'src/application/render/static-world-render-cache-coordinator.js',
        'src/presentation/render/static-world-cache.js',
        'src/application/render/main-frame-renderable-assembler.js'
      ],
      sourcePayload: [
        'world-face-packets',
        'visible chunk packet lists',
        'dirty chunk metadata',
        'camera-independent render packets'
      ],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-renderable-order-draw.js'],
        consumes: ['framePlan.order static-world-face-packet runs']
      },
      pixiConsumer: {
        status: 'indirect-partial',
        current: 'PixiJS mode still benefits while Canvas2D fallback consumes framePlan.order',
        target: 'PixiJS static-face consumer must read the same cached packets, not rebuild boxes'
      },
      migrationRisk: 'high-if-rebuilt-from-boxes',
      reuseRule: 'Use cached world-face-packets as the source of truth for static PixiJS rendering.'
    },
    {
      id: 'static-packet-run-cache',
      name: 'Shared static packet run cache',
      sourceStatus: 'consumer-specific-today-shared-contract-required',
      sourceLayer: 'presentation/render/renderer today; should be abstracted as run payload contract',
      sourceModules: [
        'src/presentation/render/renderer/canvas2d-renderable-order-draw.js',
        'src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js',
        'src/presentation/render/renderer/canvas2d-static-packet-fallback-draw.js'
      ],
      sourcePayload: [
        'consecutive static-world-face-packet run',
        'run signature',
        'run bounds',
        'run cached surface or render texture payload'
      ],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-static-bitmap-run-cache.js'],
        consumes: ['offscreen bitmap canvas run cache']
      },
      pixiConsumer: {
        status: 'missing',
        current: 'No PixiJS static packet consumer yet',
        target: 'PixiJS should consume run-level cache/RenderTexture rather than per-packet Graphics redraw'
      },
      migrationRisk: 'very-high-if-packets-redrawn-one-by-one',
      reuseRule: 'Preserve run-level batching/cache before migrating static-world-face-packet to PixiJS.'
    },
    {
      id: 'projected-geometry-cache',
      name: 'Shared projected geometry cache',
      sourceStatus: 'split-required',
      sourceLayer: 'presentation/render/renderer today; generic projection data should be separated from Canvas2D Path2D',
      sourceModules: ['src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js'],
      sourcePayload: [
        'pointsNoCamera',
        'loopsNoCamera',
        'outline segments',
        'terrain boundary segments',
        'shadow overlay projected polygons'
      ],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js'],
        consumes: ['generic projected points plus Canvas2D Path2D derivatives']
      },
      pixiConsumer: {
        status: 'missing',
        current: 'No PixiJS static-face consumer yet',
        target: 'PixiJS should reuse projected points/loops and create its own geometry/graphics derivative'
      },
      migrationRisk: 'medium-if-projection-duplicated',
      reuseRule: 'Separate generic projected geometry from Canvas2D-only Path2D cache before Pixi static-face migration.'
    },
    {
      id: 'material-color-cache',
      name: 'Shared material/color cache',
      sourceStatus: 'already-shared-source',
      sourceLayer: 'application/render builder payload',
      sourceModules: [
        'src/application/render/static-world-renderable-builder.js',
        'src/presentation/render/renderables/static-renderable-color-cache.js'
      ],
      sourcePayload: ['packet.fill', 'packet.stroke', 'material/color cache stats'],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js'],
        consumes: ['packet fill/stroke']
      },
      pixiConsumer: {
        status: 'target-shared',
        current: 'No PixiJS static-face consumer yet',
        target: 'PixiJS must consume packet.fill/stroke instead of recalculating colors'
      },
      migrationRisk: 'medium-if-colors-recomputed',
      reuseRule: 'Treat packet material/color fields as source of truth.'
    },
    {
      id: 'shadow-overlay-cache',
      name: 'Shared shadow overlay cache',
      sourceStatus: 'shared-source-conditional',
      sourceLayer: 'application/render + presentation/render projection',
      sourceModules: [
        'src/presentation/render/renderer/canvas2d-shadow-overlay-cache.js',
        'src/application/render/static-world-renderable-builder.js'
      ],
      sourcePayload: ['shadowOverlaysWorld', 'overlay projection cache'],
      canvas2dConsumer: {
        status: 'implemented-when-shadow-active',
        modules: ['src/presentation/render/renderer/canvas2d-static-world-face-draw-pass.js'],
        consumes: ['shadow overlay world/projection payload']
      },
      pixiConsumer: {
        status: 'future',
        current: 'Not migrated',
        target: 'PixiJS shadow consumer should consume shadowOverlaysWorld/projection payload'
      },
      migrationRisk: 'medium-if-shadows-recomputed',
      reuseRule: 'Do not recompute shadow overlays in renderer consumers.'
    },
    {
      id: 'visibility-culling-contract',
      name: 'Shared visibility/culling contract',
      sourceStatus: 'already-shared-source',
      sourceLayer: 'core/domain + presentation projection scope',
      sourceModules: [
        'src/core/domain/render-visibility-core.js',
        'src/presentation/render/projection/render-scope-builder.js'
      ],
      sourcePayload: ['main camera render scope', 'visible renderables', 'visible instances/lights'],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/application/render/main-frame-renderable-assembler.js'],
        consumes: ['filtered framePlan/order inputs']
      },
      pixiConsumer: {
        status: 'must-consume-existing',
        current: 'Pixi floor first pass still uses existing projection/camera context; static Pixi not yet added',
        target: 'PixiJS must consume the same culling/filtering results, never Pixi hitArea/viewport as source of truth'
      },
      migrationRisk: 'high-if-culling-reimplemented',
      reuseRule: 'Use existing camera scope and filtered renderables for all renderers.'
    },
    {
      id: 'occupancy-cache-contract',
      name: 'Shared occupancy cache contract',
      sourceStatus: 'already-shared-source',
      sourceLayer: 'core/state',
      sourceModules: ['src/core/state/scene-session-state.js'],
      sourcePayload: ['occupancy snapshot', 'occupancy cache version'],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/application/render/static-world-render-cache-coordinator.js'],
        consumes: ['render occupancy snapshot']
      },
      pixiConsumer: {
        status: 'indirect',
        current: 'PixiJS benefits only through shared cached renderables today',
        target: 'PixiJS should never rebuild occupancy from boxes'
      },
      migrationRisk: 'high-if-rebuilt-per-frame',
      reuseRule: 'Read occupancy snapshots through existing render build path only.'
    },
    {
      id: 'interaction-fast-path-contract',
      name: 'Shared interaction fast path contract',
      sourceStatus: 'already-shared-frame-order-source',
      sourceLayer: 'presentation/render/frame + Canvas2D preview today',
      sourceModules: [
        'src/presentation/render/frame/player-move-fast-path.js',
        'src/presentation/render/renderer/canvas2d-zoom-preview-state.js'
      ],
      sourcePayload: ['player move fast path frame order', 'zoom preview snapshot state'],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-frame-pipeline.js'],
        consumes: ['fast path order or preview capture']
      },
      pixiConsumer: {
        status: 'future-partial',
        current: 'PixiJS floor mode still receives framePlan.order; zoom preview is Canvas2D-specific today',
        target: 'PixiJS must respect fast path order and later use a shared preview snapshot/RenderTexture concept'
      },
      migrationRisk: 'medium-if-interaction-paths-bypassed',
      reuseRule: 'Do not disable player move or zoom preview fast paths during Pixi migration.'
    },
    {
      id: 'performance-audit-contract',
      name: 'Shared performance audit contract',
      sourceStatus: 'already-shared-diagnostics',
      sourceLayer: 'presentation/render/diagnostics',
      sourceModules: [
        'src/presentation/render/diagnostics/pixi-migration-performance-comparison-diagnostics.js',
        'src/presentation/render/diagnostics/pixi-migration-optimization-audit-diagnostics.js'
      ],
      sourcePayload: ['frame summary', 'cache summary', 'backend comparison summary'],
      canvas2dConsumer: {
        status: 'implemented',
        modules: ['src/presentation/render/renderer/canvas2d-frame-pipeline.js'],
        consumes: ['pipeline timing']
      },
      pixiConsumer: {
        status: 'implemented-for-floor-first-pass',
        current: 'PixiJS floor timing is recorded; cache contract timing still needs bridge after abstraction',
        target: 'Every PixiJS consumer must publish comparable timing/cache-hit fields'
      },
      migrationRisk: 'low-but-critical-for-validation',
      reuseRule: 'Do not claim performance wins without shared perf summary fields.'
    }
  ];

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function listContracts() { return clone(CONTRACTS); }

  function getContract(id) {
    for (var i = 0; i < CONTRACTS.length; i++) if (CONTRACTS[i].id === id) return clone(CONTRACTS[i]);
    return null;
  }

  function summarizeContracts() {
    var summary = {
      total: CONTRACTS.length,
      sharedSourceReady: 0,
      sharedSourceRequired: 0,
      splitRequired: 0,
      pixiConsumerMissing: 0,
      highRiskIfBypassed: 0,
      contractIds: []
    };
    CONTRACTS.forEach(function (contract) {
      summary.contractIds.push(contract.id);
      if (String(contract.sourceStatus || '').indexOf('already-shared') >= 0) summary.sharedSourceReady += 1;
      if (String(contract.sourceStatus || '').indexOf('required') >= 0) summary.sharedSourceRequired += 1;
      if (String(contract.sourceStatus || '').indexOf('split') >= 0) summary.splitRequired += 1;
      if (contract.pixiConsumer && /missing|future/.test(String(contract.pixiConsumer.status || ''))) summary.pixiConsumerMissing += 1;
      if (/high|very-high/.test(String(contract.migrationRisk || ''))) summary.highRiskIfBypassed += 1;
    });
    return summary;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    listContracts: listContracts,
    getContract: getContract,
    summarizeContracts: summarizeContracts
  };

  try {
    global.__SHARED_RENDER_OPTIMIZATION_CONTRACTS__ = api;
    if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
      global.__APP_NAMESPACE.bind('renderer.optimization.sharedContracts', api, { owner: OWNER, phase: PHASE });
    } else {
      global.App = global.App || {};
      global.App.renderer = global.App.renderer || {};
      global.App.renderer.optimization = global.App.renderer.optimization || {};
      global.App.renderer.optimization.sharedContracts = api;
    }
  } catch (_) {
    global.__SHARED_RENDER_OPTIMIZATION_CONTRACTS__ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
