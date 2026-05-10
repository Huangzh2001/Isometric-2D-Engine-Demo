// PXM-07 UI backend verification controls.
// Layer: presentation/ui.
//
// This module only adds UI controls for selecting the existing world renderer
// backend query parameter and reloading the page. It does not initialize PixiJS,
// does not render world content, does not own pointer/picking, and does not
// mutate map/object/actor/player business state.
(function registerPixiBackendTestControls(global) {
  if (!global) return;

  var OWNER = 'src/presentation/ui/pixi-backend-test-controls.js';
  var STEP = 'PXM-07';
  var PREFIX = '[pixi-migration][step=' + STEP + ']';
  var STORAGE_KEY = 'pixiMigrationBackendUiControlPending';
  var DEFAULT_BACKEND = 'pixi';

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
    var line = PREFIX + '[' + String(section || 'ui-control') + ']';
    var extra = formatPayload(payload);
    if (extra) line += ' ' + extra;
    try {
      if (typeof global.logInfo === 'function') global.logInfo(line);
      else if (typeof global.pushLog === 'function') global.pushLog(line);
      else if (global.console && typeof global.console.log === 'function') global.console.log(line);
    } catch (_) {}
    return line;
  }

  function getElement(id) {
    try { return global.document && global.document.getElementById ? global.document.getElementById(id) : null; } catch (_) {}
    return null;
  }

  function sanitizeBackendName(value) {
    var name = String(value || '').trim().toLowerCase();
    if (name === 'pixijs' || name === 'pixi-js') return 'pixi';
    if (name === 'canvas' || name === 'canvas2d-renderer') return 'canvas2d';
    if (name === 'pixi' || name === 'canvas2d') return name;
    return DEFAULT_BACKEND;
  }

  function readRequestedBackendFromUrl() {
    try {
      var params = new URLSearchParams(global.location && global.location.search || '');
      return sanitizeBackendName(params.get('worldRendererBackend') || params.get('worldRenderer') || params.get('rendererBackend') || DEFAULT_BACKEND);
    } catch (_) {}
    return DEFAULT_BACKEND;
  }

  function getBackendSelectionSnapshot() {
    try {
      var selection = global.__WORLD_RENDERER_BACKEND_SELECTION__ || null;
      if (selection && typeof selection.getSnapshot === 'function') return selection.getSnapshot() || {};
    } catch (_) {}
    return {};
  }

  function getActiveBackend() {
    var snapshot = getBackendSelectionSnapshot();
    if (snapshot.activeBackend) return String(snapshot.activeBackend);
    try {
      var api = global.App && global.App.renderer && global.App.renderer.active;
      if (api && api.backend) return String(api.backend);
      return api ? 'registered-unknown' : 'missing';
    } catch (_) {}
    return 'unknown';
  }

  function readPendingAction() {
    try {
      if (!global.sessionStorage) return null;
      var raw = global.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      global.sessionStorage.removeItem(STORAGE_KEY);
      return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function writePendingAction(action, backend) {
    try {
      if (!global.sessionStorage) return false;
      global.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        action: String(action || ''),
        backend: sanitizeBackendName(backend),
        at: new Date().toISOString(),
        source: 'ui-button'
      }));
      return true;
    } catch (_) {}
    return false;
  }

  function normalizeKnownBackendName(value) {
    var name = String(value || '').trim().toLowerCase();
    if (name === 'pixijs' || name === 'pixi-js') return 'pixi';
    if (name === 'canvas' || name === 'canvas2d-renderer') return 'canvas2d';
    if (name === 'pixi' || name === 'canvas2d') return name;
    return String(value || 'unknown');
  }

  function formatBackendLabel(value) {
    var backend = normalizeKnownBackendName(value);
    if (backend === 'pixi') return 'PixiJS';
    if (backend === 'canvas2d') return 'Canvas2D';
    return String(backend || 'unknown');
  }

  function setStatus(message) {
    var status = getElement('pixiBackendTestStatus');
    if (status) status.textContent = message;
  }

  function setEngineStatus(requested, active) {
    var engineStatus = getElement('worldRendererEngineStatus');
    if (!engineStatus) return;
    var requestedBackend = sanitizeBackendName(requested || readRequestedBackendFromUrl());
    var activeBackend = normalizeKnownBackendName(active || getActiveBackend());
    engineStatus.textContent = '当前世界渲染引擎：' + formatBackendLabel(activeBackend) + '（requested=' + requestedBackend + '，active=' + activeBackend + '）';
  }

  function buildBackendUrl(backend) {
    var nextBackend = sanitizeBackendName(backend);
    var url;
    try {
      url = new URL(global.location.href);
      url.searchParams.set('worldRendererBackend', nextBackend);
      return url.toString();
    } catch (_) {}
    return nextBackend === 'pixi' ? 'index.html?worldRendererBackend=pixi' : 'index.html?worldRendererBackend=canvas2d';
  }

  function navigateToBackend(backend, action) {
    var nextBackend = sanitizeBackendName(backend);
    var currentRequested = readRequestedBackendFromUrl();
    var targetUrl = buildBackendUrl(nextBackend);
    writePendingAction(action, nextBackend);
    emit('ui-control', {
      action: action || 'switch-backend',
      requestedBackendBefore: currentRequested,
      requestedBackendAfter: nextBackend,
      targetUrlHasWorldRendererBackend: true,
      reload: true,
      source: 'button-click'
    });
    setStatus(nextBackend === 'pixi'
      ? 'PixiJS 地块层：正在刷新并启用 PixiJS tile / floor backend……'
      : 'PixiJS 地块层：正在刷新并回到 Canvas2D……');
    try { global.location.assign(targetUrl); }
    catch (_) { try { global.location.href = targetUrl; } catch (__) {} }
  }

  function getPerfDiagnostics() {
    try { return global.__PIXI_MIGRATION_PERFORMANCE_COMPARISON_DIAGNOSTICS__ || null; } catch (_) {}
    return null;
  }

  function startCurrentBackendPerfSample() {
    var diagnostics = getPerfDiagnostics();
    var active = getActiveBackend();
    emit('ui-control', {
      action: 'start-current-backend-performance-sample',
      requested: readRequestedBackendFromUrl(),
      active: active,
      perfDiagnosticsPresent: !!diagnostics,
      source: 'button-click'
    });
    if (diagnostics && typeof diagnostics.beginSample === 'function') {
      diagnostics.beginSample({ backend: active, maxFrames: 180, source: 'ui-button' });
      setStatus('性能采样：正在采样当前后端 ' + active + '，约 180 帧后会在日志中输出 [perf-summary]。');
      return true;
    }
    setStatus('性能采样：诊断模块未加载，无法开始采样。');
    return false;
  }

  function emitCurrentPerformanceComparison() {
    var diagnostics = getPerfDiagnostics();
    emit('ui-control', {
      action: 'emit-performance-comparison',
      requested: readRequestedBackendFromUrl(),
      active: getActiveBackend(),
      perfDiagnosticsPresent: !!diagnostics,
      source: 'button-click'
    });
    if (diagnostics && typeof diagnostics.emitComparison === 'function') {
      diagnostics.emitComparison();
      setStatus('性能对比：已请求输出 [comparison] 日志；如果缺少 Canvas2D 或 PixiJS 采样，请分别在两个后端各运行一次性能采样。');
      return true;
    }
    setStatus('性能对比：诊断模块未加载。');
    return false;
  }

  function updateButtonState() {
    var requested = readRequestedBackendFromUrl();
    var active = getActiveBackend();
    var enablePixi = getElement('enablePixiBackendTest');
    var enableCanvas = getElement('enableCanvas2dBackendTest');
    var runPerf = getElement('runPixiPerfSample');
    var comparePerf = getElement('comparePixiPerfSample');
    if (enablePixi) enablePixi.disabled = requested === 'pixi';
    if (enableCanvas) enableCanvas.disabled = requested === 'canvas2d';
    if (runPerf) runPerf.disabled = false;
    if (comparePerf) comparePerf.disabled = false;
    setEngineStatus(requested, active);
    setStatus('默认后端：PixiJS。requested=' + requested + '，active=' + active + '。如需对照测试，可点击“回到 Canvas2D”；点击“切换到 PixiJS”会刷新回 PixiJS backend。');
    return { requested: requested, active: active };
  }

  function bindControls() {
    var enablePixi = getElement('enablePixiBackendTest');
    var enableCanvas = getElement('enableCanvas2dBackendTest');
    var runPerf = getElement('runPixiPerfSample');
    var comparePerf = getElement('comparePixiPerfSample');
    var status = updateButtonState();
    var pending = readPendingAction();
    emit('ui-control', {
      owner: OWNER,
      layer: 'presentation/ui',
      touchedFeature: 'pixi-tile-floor-layer-ui-control',
      requested: status.requested,
      active: status.active,
      pendingAction: pending && pending.action || 'none',
      pendingBackend: pending && pending.backend || 'none',
      pixiButtonPresent: !!enablePixi,
      canvas2dButtonPresent: !!enableCanvas,
      perfSampleButtonPresent: !!runPerf,
      perfCompareButtonPresent: !!comparePerf,
      ownsPointer: false,
      ownsPicking: false,
      mutatesBusinessObjects: false,
      source: 'bind-controls'
    });
    if (enablePixi) {
      enablePixi.addEventListener('click', function () {
        navigateToBackend('pixi', 'enable-pixi-tile-floor-layer');
      });
    }
    if (enableCanvas) {
      enableCanvas.addEventListener('click', function () {
        navigateToBackend('canvas2d', 'enable-canvas2d-backend');
      });
    }
    if (runPerf) {
      runPerf.addEventListener('click', function () {
        startCurrentBackendPerfSample();
      });
    }
    if (comparePerf) {
      comparePerf.addEventListener('click', function () {
        emitCurrentPerformanceComparison();
      });
    }
    try {
      if (!global.__PIXI_BACKEND_TEST_STATUS_INTERVAL__) {
        global.__PIXI_BACKEND_TEST_STATUS_INTERVAL__ = global.setInterval(function () {
          try { updateButtonState(); } catch (_) {}
        }, 1000);
      }
    } catch (_) {}
    return true;
  }

  function getStatus() {
    var requested = readRequestedBackendFromUrl();
    return {
      step: STEP,
      owner: OWNER,
      layer: 'presentation/ui',
      requestedBackend: requested,
      activeBackend: getActiveBackend(),
      enablePixiButton: !!getElement('enablePixiBackendTest'),
      enableCanvas2dButton: !!getElement('enableCanvas2dBackendTest'),
      perfSampleButton: !!getElement('runPixiPerfSample'),
      perfCompareButton: !!getElement('comparePixiPerfSample'),
      ownsPointer: false,
      ownsPicking: false,
      mutatesBusinessObjects: false
    };
  }

  var api = {
    owner: OWNER,
    step: STEP,
    bindControls: bindControls,
    getStatus: getStatus,
    switchToPixi: function switchToPixi() { navigateToBackend('pixi', 'enable-pixi-tile-floor-layer'); },
    switchToCanvas2d: function switchToCanvas2d() { navigateToBackend('canvas2d', 'enable-canvas2d-backend'); }
  };

  try {
    global.__PIXI_MIGRATION_BACKEND_TEST_CONTROLS__ = api;
    global.App = global.App || {};
    global.App.ui = global.App.ui || {};
    global.App.ui.pixiBackendTestControls = api;
  } catch (_) {}

  if (global.document && global.document.readyState === 'loading') {
    global.document.addEventListener('DOMContentLoaded', bindControls, { once: true });
  } else {
    bindControls();
  }
})(typeof window !== 'undefined' ? window : globalThis);
