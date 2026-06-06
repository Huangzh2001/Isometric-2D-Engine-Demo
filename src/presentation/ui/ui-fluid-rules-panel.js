(function () {
  var OWNER = 'src/presentation/ui/ui-fluid-rules-panel.js';
  var timer = null;
  var lastStats = null;

  function getUi() { try { return window.ui || ui || null; } catch (_) { return window.ui || null; } }
  function getRulesCore() { try { return window.__FLUID_RULES_CORE__ || (window.App && window.App.domain && window.App.domain.fluidRulesCore) || null; } catch (_) { return window.__FLUID_RULES_CORE__ || null; } }
  function getSceneSession() { try { return window.__SCENE_SESSION_STATE__ || (window.App && window.App.state && window.App.state.sceneSession) || null; } catch (_) { return window.__SCENE_SESSION_STATE__ || null; } }
  function getSceneGraph() { try { return window.__SCENE_GRAPH_STATE__ || (window.App && window.App.state && window.App.state.sceneGraph) || null; } catch (_) { return window.__SCENE_GRAPH_STATE__ || null; } }
  function getPrefabRegistry() { try { return window.App && window.App.state && window.App.state.prefabRegistry ? window.App.state.prefabRegistry : null; } catch (_) { return null; } }

  function num(el, fallback, min, max) {
    var n = Number(el && el.value);
    if (!Number.isFinite(n)) n = Number(fallback || 0);
    if (min != null) n = Math.max(min, n);
    if (max != null) n = Math.min(max, n);
    if (el) el.value = String(n);
    return n;
  }
  function bool(el, fallback) { return el ? !!el.checked : !!fallback; }

  function getLayerCount() {
    var u = getUi();
    var n = Math.round(num(u && u.fluidRenderLayerCount, 4, 2, 64));
    if (n % 2 !== 0) n += 1;
    if (n > 64) n = 64;
    if (u && u.fluidRenderLayerCount) u.fluidRenderLayerCount.value = String(n);
    return n;
  }

  function readParams() {
    var u = getUi();
    return {
      layerCount: getLayerCount(),
      intervalSec: num(u && u.fluidRulesIntervalSec, 0.25, 0.05, 10),
      flowRate: num(u && u.fluidRulesFlowRate, 0.2, 0, 1),
      maxFlowPerTick: num(u && u.fluidRulesMaxFlow, 0.08, 0, 1),
      minDiff: num(u && u.fluidRulesMinDiff, 0.03, 0, 1),
      diagonalEnabled: bool(u && u.fluidRulesDiagonalEnabled, true),
      diagonalWeight: num(u && u.fluidRulesDiagonalWeight, 0.7, 0, 1),
      gravityEnabled: bool(u && u.fluidRulesGravityEnabled, true),
      gravityMaxFlowPerTick: num(u && u.fluidRulesGravityMaxFlow, 1, 0, 1),
      deleteBelow: num(u && u.fluidRulesDeleteBelow, 0.005, 0, 0.25)
    };
  }

  function ensureLayerPrefabs(layerCount) {
    try {
      var registry = getPrefabRegistry();
      if (registry && typeof registry.ensureLiquidWaterLayerPrefabs === 'function') registry.ensureLiquidWaterLayerPrefabs(layerCount, { source: 'fluid-rules-ui:ensureLayerPrefabs' });
    } catch (_) {}
  }

  function push(msg) {
    try {
      if (typeof pushLog === 'function') pushLog('[fluid-rules] ' + msg);
      else if (console && console.log) console.log('[fluid-rules] ' + msg);
    } catch (_) {}
  }

  function updateStatus(prefix, stats) {
    var u = getUi();
    if (!u || !u.fluidRulesStatus) return;
    var p = readParams();
    var s = stats || lastStats || {};
    u.fluidRulesStatus.textContent =
      String(prefix || (timer ? '自动运行中' : '规则未运行')) +
      '；间隔=' + p.intervalSec.toFixed(2) + 's' +
      '；流速=' + p.flowRate.toFixed(2) +
      '；maxFlow=' + p.maxFlowPerTick.toFixed(2) +
      '；重力=' + (p.gravityEnabled ? '开' : '关') + '/' + p.gravityMaxFlowPerTick.toFixed(2) +
      '；水格 ' + String(s.waterCellsBefore != null ? s.waterCellsBefore : '-') + ' → ' + String(s.waterCellsAfter != null ? s.waterCellsAfter : '-') +
      '；新建=' + String(s.created != null ? s.created : '-') +
      '；删除=' + String(s.removed != null ? s.removed : '-') +
      '；总量误差=' + String(s.massError != null ? s.massError : '-');
  }

  function invalidateRender(reason) {
    try { if (typeof invalidateStaticWorldRenderCache === 'function') invalidateStaticWorldRenderCache(reason || 'fluid-rules'); } catch (_) {}
    try { if (typeof invalidateRenderCache === 'function') invalidateRenderCache(reason || 'fluid-rules'); } catch (_) {}
    try { if (typeof requestRender === 'function') requestRender(); } catch (_) {}
    try { if (typeof updatePreview === 'function') updatePreview(); } catch (_) {}
  }

  function stepOnce(source) {
    var core = getRulesCore();
    var session = getSceneSession();
    var graph = getSceneGraph();
    if (!core || typeof core.simulateStep !== 'function') { updateStatus('规则核心未加载', null); return null; }
    var instances = session && typeof session.getInstances === 'function' ? session.getInstances() : (Array.isArray(window.instances) ? window.instances : []);
    var boxes = session && typeof session.getBoxes === 'function' ? session.getBoxes() : (Array.isArray(window.boxes) ? window.boxes : []);
    var params = readParams();
    ensureLayerPrefabs(params.layerCount);
    var result = core.simulateStep({ instances: instances, boxes: boxes }, params, {
      allocateInstanceId: function () {
        if (session && typeof session.allocateInstanceId === 'function') return session.allocateInstanceId({ source: 'fluid-rules:allocateInstanceId' });
        return 'fluid_' + Math.random().toString(36).slice(2, 10);
      }
    });
    if (!result || !Array.isArray(result.instances)) { updateStatus('规则执行失败', null); return null; }
    if (graph && typeof graph.replaceSceneGraph === 'function') graph.replaceSceneGraph({ instances: result.instances }, { source: source || 'fluid-rules:stepOnce' });
    else {
      try { window.instances = result.instances; } catch (_) {}
      try { if (typeof rebuildBoxesFromInstances === 'function') rebuildBoxesFromInstances({ source: source || 'fluid-rules:stepOnce:fallback' }); } catch (_) {}
    }
    lastStats = result.stats || {};
    invalidateRender(source || 'fluid-rules:stepOnce');
    updateStatus(timer ? '自动运行中' : '已单步执行', lastStats);
    push('step source=' + String(source || 'unknown') + ' stats=' + JSON.stringify(lastStats));
    return lastStats;
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    var u = getUi();
    if (u && u.fluidRulesEnabled) u.fluidRulesEnabled.checked = false;
    updateStatus('已停止', lastStats);
  }

  function start() {
    stop();
    var p = readParams();
    var u = getUi();
    if (u && u.fluidRulesEnabled) u.fluidRulesEnabled.checked = true;
    timer = setInterval(function () { stepOnce('fluid-rules:auto-tick'); }, Math.max(50, Math.round(p.intervalSec * 1000)));
    updateStatus('自动运行中', lastStats);
  }

  function restartIfEnabled() {
    var u = getUi();
    if (u && u.fluidRulesEnabled && u.fluidRulesEnabled.checked) start();
    else updateStatus('参数已更新', lastStats);
  }

  function bind() {
    var u = getUi();
    if (!u) return false;
    if (u.fluidRulesStepOnce && !u.fluidRulesStepOnce.__fluidRulesBound) { u.fluidRulesStepOnce.__fluidRulesBound = true; u.fluidRulesStepOnce.addEventListener('click', function () { stepOnce('ui.fluidRulesStepOnce.click'); }); }
    if (u.fluidRulesStart && !u.fluidRulesStart.__fluidRulesBound) { u.fluidRulesStart.__fluidRulesBound = true; u.fluidRulesStart.addEventListener('click', start); }
    if (u.fluidRulesStop && !u.fluidRulesStop.__fluidRulesBound) { u.fluidRulesStop.__fluidRulesBound = true; u.fluidRulesStop.addEventListener('click', stop); }
    if (u.fluidRulesEnabled && !u.fluidRulesEnabled.__fluidRulesBound) { u.fluidRulesEnabled.__fluidRulesBound = true; u.fluidRulesEnabled.addEventListener('change', function () { if (u.fluidRulesEnabled.checked) start(); else stop(); }); }

    [u.fluidRulesIntervalSec, u.fluidRulesFlowRate, u.fluidRulesMaxFlow, u.fluidRulesMinDiff, u.fluidRulesDiagonalEnabled, u.fluidRulesDiagonalWeight, u.fluidRulesDeleteBelow].forEach(function (el) {
      if (!el || el.__fluidRulesParamBound) return;
      el.__fluidRulesParamBound = true;
      el.addEventListener('change', restartIfEnabled);
      el.addEventListener('blur', restartIfEnabled);
    });

    updateStatus('规则未运行', lastStats);
    return true;
  }

  window.__FLUID_RULES_UI__ = { owner: OWNER, readParams: readParams, stepOnce: stepOnce, start: start, stop: stop, bind: bind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
  else bind();
})();
