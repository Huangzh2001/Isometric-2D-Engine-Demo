(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/audit/architecture-layer-audit.js';
  var PHASE = 'P12-LAYER';
  var manifest = {
    phase: PHASE,
    owner: OWNER,
    layers: {
      presentation: {
        label: '表现层/交互层',
        paths: [
          'src/presentation/shell/app.js',
          'src/presentation/shell/dom-registry.js',
          'src/presentation/shell/app-shell.js',
          'src/presentation/ui/ui.js',
          'src/presentation/ui/ui-tabs.js',
          'src/presentation/ui/ui-inspectors.js',
          'src/presentation/ui/ui-habbo-library.js',
          'src/presentation/render/logic.js',
          'src/presentation/render/render.js',
          'src/presentation/render/renderer/canvas2d-renderer.js',
          'src/presentation/lighting/lighting-editor.js',
          'src/presentation/lighting/lighting-render.js',
          'src/presentation/lighting/lighting.js',
          'src/presentation/editor/editor-unified-v18.js',
          'src/presentation/floor-editor/floor-editor-shell.js'
        ]
      },
      application: {
        label: '应用层/编排层',
        paths: [
          'src/application/controllers/app-controllers.js',
          'src/application/placement/placement.js',
          'src/application/state/state-actions.js',
          'src/application/player/player.js',
          'src/application/assets/asset-import.js',
          'src/application/floor-editor/floor-editor-controller.js'
        ]
      },
      core: {
        label: '核心层',
        paths: [
          'src/core/domain/scene-domain-core.js',
          'src/core/domain/portable-core.js',
          'src/core/domain/view-rotation-core.js',
          'src/core/domain/item-facing-core.js',
          'src/core/state/runtime-state.js',
          'src/core/state/prefab-registry.js',
          'src/core/state/scene-session-state.js',
          'src/core/state/state-owner-map.js',
          'src/core/state/state-selectors.js',
          'src/core/lighting/lighting-state.js',
          'src/core/scene/scene-keys.js',
          'src/core/domain/floor-plan-domain-core.js',
          'src/core/state/floor-editor-state.js'
        ]
      },
      infrastructure: {
        label: '基础设施/平台适配/兼容层',
        paths: [
          'src/infrastructure/bootstrap/app-namespace.js',
          'src/infrastructure/logging/logging.js',
          'src/infrastructure/logging/p0-phase-logger.js',
          'src/infrastructure/logging/item-rotation-diagnostic-log.js',
          'src/infrastructure/logging/floor-editor-diagnostic-log.js',
          'src/infrastructure/services/scene-api.js',
          'src/infrastructure/services/prefab-api.js',
          'src/infrastructure/services/habbo-api.js',
          'src/infrastructure/services/asset-api.js',
          'src/infrastructure/assets/asset-management.js',
          'src/infrastructure/storage/scene-storage.js',
          'src/infrastructure/audit/placement-route-audit.js',
          'src/infrastructure/adapters/placement-effects.js',
          'src/infrastructure/self-check/self-check.js',
          'src/infrastructure/self-check/scenario-runner.js',
          'src/infrastructure/legacy/state.js',
          'src/infrastructure/storage/floor-editor-storage.js'
        ]
      }
    },
    migrationGoal: {
      preserveLayers: ['application', 'core'],
      rewriteLayers: ['presentation'],
      rewriteInfrastructure: ['platform adapters', 'storage/network implementations'],
      temporaryCompat: ['legacy', 'audit', 'bridge']
    }
  };
  function safeJson(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function countPaths(obj) {
    var out = {};
    try {
      Object.keys(obj.layers || {}).forEach(function (key) {
        var item = obj.layers[key] || {};
        out[key] = Array.isArray(item.paths) ? item.paths.length : 0;
      });
    } catch (_) {}
    return out;
  }
  function summarize(label) {
    return {
      phase: manifest.phase,
      owner: manifest.owner,
      label: String(label || ''),
      layerCounts: countPaths(manifest),
      preserveLayers: safeJson(manifest.migrationGoal.preserveLayers),
      rewriteLayers: safeJson(manifest.migrationGoal.rewriteLayers),
      rewriteInfrastructure: safeJson(manifest.migrationGoal.rewriteInfrastructure),
      temporaryCompat: safeJson(manifest.migrationGoal.temporaryCompat)
    };
  }
  function getManifest() { return safeJson(manifest); }
  function api() {
    return {
      phase: manifest.phase,
      owner: manifest.owner,
      summarize: summarize,
      getManifest: getManifest
    };
  }
  function log(event, extra) {
    var line = '[ARCH-LAYERS] ' + String(event || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) {}
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (_) {}
  }
  try {
    window.__ARCHITECTURE_LAYER_AUDIT__ = api();
    window.App = window.App || {};
    window.App.audit = window.App.audit || {};
    window.App.audit.architectureLayers = api();
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('audit.architectureLayers', api(), { owner: OWNER, phase: PHASE });
    }
    log('layer-scaffold-ready', summarize('boot'));
  } catch (err) {
    log('layer-scaffold-error', { error: String(err && err.message ? err.message : err) });
  }
})();
