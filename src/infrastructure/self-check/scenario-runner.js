(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/infrastructure/self-check/scenario-runner.js';
  var PHASE = 'P8X';
  var DEFAULT_HABBO_ROOT = 'E:\\hzh\\02_娱乐\\Habbo\\habbofurni_models_classified';
  var SESSION_KEY = '__ACCEPTANCE_REPLAY_SESSION__';
  var CURRENT_REPORTS_KEY = '__ACCEPTANCE_REPLAY_REPORTS__';
  var DEFAULT_DELAY = 780;
  var currentRun = null;
  var pointerEl = null;
  var panelEl = null;

  function ui() { try { return window.ui || null; } catch (_) { return null; } }
  function nowIso() { return new Date().toISOString(); }
  function sleep(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function safeJson(value) { try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; } }
  function appPath(path) {
    try {
      var node = window.App; String(path || '').split('.').filter(Boolean).forEach(function (p) { node = node ? node[p] : undefined; });
      return node;
    } catch (_) { return undefined; }
  }
  function getSession() {
    try { var raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
  }
  function setSession(session) {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (_) {}
  }
  function clearSession() {
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
  }
  function getStoredReports() {
    try { var raw = localStorage.getItem(CURRENT_REPORTS_KEY); return raw ? JSON.parse(raw) : []; } catch (_) { return []; }
  }
  function setStoredReports(reports) {
    try { localStorage.setItem(CURRENT_REPORTS_KEY, JSON.stringify(reports || [])); } catch (_) {}
  }
  function editorHealthStorageKey(sessionId) { return '__EDITOR_NORMAL_HEALTH_RESULT__:' + String(sessionId || ''); }
  function getEditorHealthResult(sessionId) { try { var raw = localStorage.getItem(editorHealthStorageKey(sessionId)); return raw ? JSON.parse(raw) : null; } catch (_) { return null; } }
  function clearEditorHealthResult(sessionId) { try { localStorage.removeItem(editorHealthStorageKey(sessionId)); } catch (_) {} }
  function bindApi(path, api) {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') window.__APP_NAMESPACE.bind(path, api, { owner: OWNER, phase: PHASE });
      else {
        window.App = window.App || {}; window.App.debug = window.App.debug || {}; window.App.debug.scenarioRunner = api;
      }
    } catch (_) {}
  }
  function log(line, extra) {
    var text = '[REPLAY] ' + String(line || '');
    if (typeof extra !== 'undefined') {
      try { text += ' ' + JSON.stringify(extra); } catch (_) {}
    }
    try { if (typeof pushLog === 'function') pushLog(text); else console.log(text); } catch (_) {}
    setStatus(text);
    return text;
  }
  function setStatus(message) {
    var u = ui();
    if (u && u.acceptanceReplayStatus) u.acceptanceReplayStatus.textContent = String(message || '');
    ensureOverlay();
    if (panelEl) panelEl.textContent = String(message || '');
  }
  function ensureOverlay() {
    if (!pointerEl) {
      pointerEl = document.createElement('div');
      pointerEl.id = 'scenarioReplayPointer';
      pointerEl.style.cssText = 'position:fixed;left:0;top:0;width:16px;height:16px;border-radius:50%;background:#ff4d6d;border:2px solid #fff;box-shadow:0 0 0 2px rgba(0,0,0,.35);pointer-events:none;z-index:999999;transform:translate(-50%,-50%);display:none;';
      document.body.appendChild(pointerEl);
    }
    if (!panelEl) {
      panelEl = document.createElement('div');
      panelEl.id = 'scenarioReplayPanel';
      panelEl.style.cssText = 'position:fixed;right:14px;top:14px;max-width:360px;padding:10px 12px;border-radius:10px;background:rgba(10,14,24,.88);color:#f2f6ff;font:600 13px/1.45 system-ui;z-index:999998;box-shadow:0 10px 30px rgba(0,0,0,.35);pointer-events:none;';
      panelEl.textContent = '验收回放：待命';
      document.body.appendChild(panelEl);
    }
  }
  function hidePointer() { ensureOverlay(); pointerEl.style.display = 'none'; }
  function showPointer() { ensureOverlay(); pointerEl.style.display = 'block'; }
  async function movePointerToClient(clientX, clientY, options) {
    options = options || {};
    ensureOverlay();
    showPointer();
    var fromX = Number(pointerEl.dataset.x || clientX);
    var fromY = Number(pointerEl.dataset.y || clientY);
    var duration = Number(options.duration || DEFAULT_DELAY);
    var steps = Math.max(1, Number(options.steps || 14));
    for (var i = 1; i <= steps; i++) {
      if (currentRun && currentRun.stopRequested) throw new Error('replay-stopped');
      var t = i / steps;
      var x = fromX + (clientX - fromX) * t;
      var y = fromY + (clientY - fromY) * t;
      pointerEl.style.left = x + 'px';
      pointerEl.style.top = y + 'px';
      pointerEl.dataset.x = String(x);
      pointerEl.dataset.y = String(y);
      await sleep(duration / steps);
    }
  }
  function dispatchMouse(target, type, clientX, clientY, extra) {
    if (!target) return;
    var event = new MouseEvent(type, Object.assign({ bubbles: true, cancelable: true, view: window, clientX: clientX, clientY: clientY, button: 0, buttons: type === 'mouseup' || type === 'mouseenter' || type === 'mouseleave' || type === 'click' ? 0 : 1 }, extra || {}));
    target.dispatchEvent(event);
  }
  async function clickElement(el, label, options) {
    if (!el) throw new Error('missing-element:' + String(label || 'unknown'));
    options = options || {};
    var rect = el.getBoundingClientRect();
    var x = rect.left + rect.width / 2;
    var y = rect.top + rect.height / 2;
    log('click:' + String(label || el.id || el.tagName));
    await movePointerToClient(x, y, { duration: Number(options.duration || DEFAULT_DELAY) });
    dispatchMouse(el, 'mouseenter', x, y);
    dispatchMouse(el, 'mousemove', x, y);
    await sleep(Number(options.pauseBeforeDown || 100));
    dispatchMouse(el, 'mousedown', x, y, { buttons: 1, button: 0 });
    await sleep(Number(options.hold || 120));
    dispatchMouse(el, 'mouseup', x, y, { buttons: 0, button: 0 });
    dispatchMouse(el, 'click', x, y, { buttons: 0, button: 0 });
    await sleep(Number(options.after || 260));
  }
  function canvasInternalToClient(canvas, x, y) {
    var rect = canvas.getBoundingClientRect();
    return {
      clientX: rect.left + (x * rect.width / canvas.width),
      clientY: rect.top + (y * rect.height / canvas.height)
    };
  }
  async function moveMouseOnCanvas(canvas, x, y, options) {
    var pt = canvasInternalToClient(canvas, x, y);
    await movePointerToClient(pt.clientX, pt.clientY, { duration: (options && options.duration) || DEFAULT_DELAY });
    dispatchMouse(canvas, 'mouseenter', pt.clientX, pt.clientY, { buttons: 0 });
    dispatchMouse(canvas, 'mousemove', pt.clientX, pt.clientY, { buttons: (options && options.buttons) || 0 });
    return pt;
  }
  async function clickCanvas(canvas, x, y, label, options) {
    options = options || {};
    log('canvas-click:' + String(label || 'canvas'));
    var pt = await moveMouseOnCanvas(canvas, x, y, { duration: Number(options.duration || DEFAULT_DELAY) });
    await sleep(120);
    dispatchMouse(canvas, 'mousedown', pt.clientX, pt.clientY, { buttons: 1, button: 0 });
    await sleep(Number(options.hold || 120));
    dispatchMouse(canvas, 'mouseup', pt.clientX, pt.clientY, { buttons: 0, button: 0 });
    dispatchMouse(canvas, 'click', pt.clientX, pt.clientY, { buttons: 0, button: 0 });
    await sleep(Number(options.after || 360));
  }
  async function dragCanvas(canvas, startX, startY, endX, endY, label, options) {
    options = options || {};
    log('canvas-drag:' + String(label || 'drag'));
    var start = await moveMouseOnCanvas(canvas, startX, startY, { duration: Number(options.duration || DEFAULT_DELAY) });
    dispatchMouse(canvas, 'mousedown', start.clientX, start.clientY, { buttons: 1, button: 0 });
    await sleep(120);
    var steps = Math.max(6, Number(options.steps || 16));
    for (var i = 1; i <= steps; i++) {
      if (currentRun && currentRun.stopRequested) throw new Error('replay-stopped');
      var t = i / steps;
      var x = startX + (endX - startX) * t;
      var y = startY + (endY - startY) * t;
      var pt = canvasInternalToClient(canvas, x, y);
      await movePointerToClient(pt.clientX, pt.clientY, { duration: Number(options.stepDuration || 80), steps: 1 });
      dispatchMouse(canvas, 'mousemove', pt.clientX, pt.clientY, { buttons: 1, button: 0 });
      await sleep(Number(options.pauseEach || 50));
    }
    var end = canvasInternalToClient(canvas, endX, endY);
    dispatchMouse(canvas, 'mouseup', end.clientX, end.clientY, { buttons: 0, button: 0 });
    await sleep(Number(options.after || 380));
  }
  function readQueryFlag(name) {
    try { var params = new URLSearchParams(window.location.search || ''); var raw = params.get(name); return raw != null && (raw === '' || raw === '1' || raw === 'true' || raw === 'yes'); } catch (_) { return false; }
  }
  async function waitFor(test, timeoutMs, label) {
    var started = Date.now();
    while ((Date.now() - started) < (timeoutMs || 10000)) {
      if (currentRun && currentRun.stopRequested) throw new Error('replay-stopped');
      try { if (test()) return true; } catch (_) {}
      await sleep(120);
    }
    throw new Error('timeout:' + String(label || 'condition'));
  }
  async function waitForBootstrap() {
    await waitFor(function () {
      return !!appPath('controllers.main') && !!appPath('controllers.assetLibrary') && !!appPath('services.assetWorkflow') && !!window.canvas;
    }, 15000, 'bootstrap');
  }
  async function saveReport(report, hint) {
    try {
      var res = await fetch('/api/self-check/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({ report: report, filenameHint: hint })
      });
      var data = await res.json();
      return { ok: !!(res.ok && data && data.ok), status: res.status, data: data };
    } catch (err) { return { ok: false, status: 0, error: String(err && err.message ? err.message : err) }; }
  }
  async function saveReportWithRetry(report, hint, attempts) {
    var maxAttempts = Math.max(1, Number(attempts || 2));
    var last = null;
    for (var i = 0; i < maxAttempts; i++) {
      last = await saveReport(report, hint);
      if (last && last.ok) return last;
      if (i < maxAttempts - 1) await sleep(80);
    }
    return last || { ok: false, status: 0, error: 'save-report-unreached' };
  }
  function makeFlowResult(name) {
    return { name: name, startedAt: nowIso(), steps: [], ok: false };
  }
  function pushStep(flow, name, detail) {
    flow.steps.push({ name: name, at: nowIso(), detail: safeJson(detail || {}) });
  }
  async function saveFlowReport(session, flow) {
    flow.finishedAt = nowIso();
    var payload = { phase: PHASE, owner: OWNER, sessionId: session.id, entry: window.__APP_ENTRY_INFO || null, query: String(location.search || ''), flow: flow, session: { scenarioNames: session.scenarioNames || [], currentIndex: session.currentIndex || 0 } };
    flow.saved = await saveReportWithRetry(payload, 'acceptance-' + session.id + '-' + flow.name + '.json', 2);
    var reports = getStoredReports().filter(function (item) {
      try {
        return !(item && item.flow && String(item.flow.name || '') === String(flow.name || ''));
      } catch (_) { return true; }
    });
    reports.push(payload);
    setStoredReports(reports);
    try {
      payload.summaryCheckpoint = await saveAcceptanceSummaryArtifacts(session, reports, 'checkpoint:' + String(flow && flow.name ? flow.name : 'flow'));
    } catch (err) {
      payload.summaryCheckpoint = { ok: false, error: String(err && err.message ? err.message : err) };
    }
    return payload;
  }
  async function setCheckbox(el, desired, label) {
    if (!el) throw new Error('missing-checkbox:' + String(label || 'checkbox'));
    if (!!el.checked === !!desired) return;
    await clickElement(el, label || el.id || 'checkbox');
  }
  async function setRange(el, value, label) {
    if (!el) throw new Error('missing-range:' + String(label || 'range'));
    await clickElement(el, label || el.id || 'range', { duration: 420, after: 100 });
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(320);
  }
  async function setSelectValue(el, value, label) {
    if (!el) throw new Error('missing-select:' + String(label || 'select'));
    await clickElement(el, label || el.id || 'select', { duration: 420, after: 100 });
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    await sleep(260);
  }
  async function setInputValue(el, value, label) {
    if (!el) throw new Error('missing-input:' + String(label || 'input'));
    await clickElement(el, label || el.id || 'input', { duration: 300, after: 80 });
    try { el.focus(); } catch (_) {}
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    try { el.blur(); } catch (_) {}
    await sleep(320);
  }

  function dispatchKey(type, key) {
    var event = new KeyboardEvent(type, { bubbles: true, cancelable: true, key: key, code: key, composed: true });
    window.dispatchEvent(event);
  }
  async function holdKey(key, holdMs) {
    log(typeLabel('key-hold', key));
    dispatchKey('keydown', key);
    await sleep(Number(holdMs || 900));
    dispatchKey('keyup', key);
    await sleep(180);
  }
  function typeLabel(prefix, value) {
    return String(prefix || 'step') + ':' + String(value || '');
  }
  function getStateActionsApi() {
    try { return appPath('state.actions') || null; } catch (_) { return null; }
  }
  function getPlacementDispatchState() {
    var state = {
      hasControllersRoot: !!(window.App && window.App.controllers),
      hasRootDispatch: !!(window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function'),
      hasPlacementDispatch: !!(appPath('controllers.placement') && typeof appPath('controllers.placement').dispatch === 'function'),
      route: 'none'
    };
    if (state.hasRootDispatch) state.route = 'controllers.dispatch';
    else if (state.hasPlacementDispatch) state.route = 'controllers.placement.dispatch';
    return state;
  }
  function summarizeStateActions(label) {
    try {
      var api = getStateActionsApi();
      if (!api || typeof api.summarize !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarize() || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function summarizeStateActionsBoundary(label) {
    try {
      var api = getStateActionsApi();
      if (!api || typeof api.summarizeBoundary !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarizeBoundary(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }

  async function saveStateActionsBoundarySnapshot(session, stage, label, extra) {
    var payload = {
      phase: PHASE,
      owner: OWNER,
      sessionId: session && session.id ? session.id : '',
      entry: window.__APP_ENTRY_INFO || null,
      query: String(location.search || ''),
      kind: 'state-actions-boundary',
      stage: String(stage || ''),
      summary: summarizeStateActionsBoundary(label),
      extra: safeJson(extra || null)
    };
    payload.saved = await saveReport(payload, 'state-actions-boundary-' + String(session && session.id ? session.id : 'unknown') + '-' + String(stage || 'snapshot') + '.json');
    return payload;
  }

  function buildAcceptanceSummaryReport(session, results, statusText) {
    var normalizedResults = [];
    var latestByName = new Map();
    (results || []).forEach(function (item) {
      try {
        if (item && item.flow && item.flow.name) latestByName.set(String(item.flow.name), item);
      } catch (_) {}
    });
    if (latestByName.size > 0) normalizedResults = Array.from(latestByName.values());
    else normalizedResults = Array.isArray(results) ? results.slice() : [];
    return {
      phase: PHASE,
      owner: OWNER,
      generatedAt: nowIso(),
      sessionId: session.id,
      entry: window.__APP_ENTRY_INFO || null,
      query: String(location.search || ''),
      desiredHabboRoot: DEFAULT_HABBO_ROOT,
      scenarios: (session.scenarioNames || []).slice(),
      results: normalizedResults,
      rawResultCount: Array.isArray(results) ? results.length : 0,
      summary: {
        total: normalizedResults.length,
        passed: normalizedResults.filter(function (r) { return !!(r && r.flow && r.flow.ok); }).length,
        failed: normalizedResults.filter(function (r) { return !(r && r.flow && r.flow.ok); }).length,
        status: statusText || 'done'
      },
      stateActions: summarizeStateActions('acceptance-summary'),
      stateActionsBoundary: summarizeStateActionsBoundary('acceptance-summary'),
      sceneSession: summarizeSceneSession('acceptance-summary'),
      architectureLayers: summarizeArchitectureLayers('acceptance-summary'),
      portableBoundary: summarizePortableBoundary('acceptance-summary'),
      applicationBoundary: summarizeApplicationBoundary('acceptance-summary'),
      assetImportBoundary: summarizeAssetImportBoundary('acceptance-summary'),
      placementBoundary: summarizePlacementBoundary('acceptance-summary'),
      platformBoundary: summarizePlatformBoundary('acceptance-summary')
    };
  }

  async function saveAcceptanceSummaryArtifacts(session, results, statusText) {
    var report = buildAcceptanceSummaryReport(session, results, statusText);
    report.stateActionsBoundarySaved = await saveStateActionsBoundarySnapshot(session, 'acceptance-summary', 'acceptance-summary', { summaryField: 'stateActionsBoundary', detail: report.stateActionsBoundary, status: statusText || 'done' });
    report.saved = await saveReportWithRetry(report, 'acceptance-summary-' + session.id + '.json', 2);
    setStoredReports(results);
    return report;
  }

  function getApplicationBoundaryApi() {
    try {
      var main = appPath('controllers.main') || null;
      if (main && typeof main.summarizeBoundary === 'function') return main;
      return null;
    } catch (_) { return null; }
  }
  function summarizeApplicationBoundary(label) {
    try {
      var api = getApplicationBoundaryApi();
      if (!api || typeof api.summarizeBoundary !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarizeBoundary(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetApplicationBoundary(label) {
    var api = getApplicationBoundaryApi();
    if (!api || typeof api.resetBoundaryAudit !== 'function') return { ok: false, reason: 'missing-application-boundary-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetBoundaryAudit({ source: String(label || 'replay'), label: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function getAssetImportBoundaryApi() {
    try {
      return appPath('application.assetImport') || window.__ASSET_IMPORT_API || null;
    } catch (_) {
      try { return window.__ASSET_IMPORT_API || null; } catch (__) { return null; }
    }
  }
  function summarizeAssetImportBoundary(label) {
    try {
      var api = getAssetImportBoundaryApi();
      if (!api || typeof api.summarizeBoundary !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarizeBoundary(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetAssetImportBoundary(label) {
    var api = getAssetImportBoundaryApi();
    if (!api || typeof api.resetBoundaryAudit !== 'function') return { ok: false, reason: 'missing-asset-import-boundary-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetBoundaryAudit({ source: String(label || 'replay'), label: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }

  function getPlacementBoundaryApi() {
    try {
      return appPath('application.placementBoundary') || appPath('application.placementCore') || window.__PLACEMENT_CORE_API__ || null;
    } catch (_) {
      try { return window.__PLACEMENT_CORE_API__ || null; } catch (__) { return null; }
    }
  }
  function summarizePlacementBoundary(label) {
    try {
      var api = getPlacementBoundaryApi();
      if (!api) return { label: String(label || ''), available: false };
      var fn = (typeof api.summarizeBoundary === 'function') ? api.summarizeBoundary : (typeof api.summarize === 'function' ? api.summarize : null);
      if (!fn) return { label: String(label || ''), available: false };
      var summary = fn(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetPlacementBoundary(label) {
    var api = getPlacementBoundaryApi();
    if (!api) return { ok: false, reason: 'missing-placement-boundary-reset' };
    var fn = (typeof api.resetBoundaryAudit === 'function') ? api.resetBoundaryAudit : (typeof api.resetAudit === 'function' ? api.resetAudit : null);
    if (!fn) return { ok: false, reason: 'missing-placement-boundary-reset' };
    try {
      return { ok: true, summary: safeJson(fn({ source: String(label || 'replay'), label: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function getPlacementControllerApi() {
    try { return appPath('controllers.placement') || null; } catch (_) { return null; }
  }
  function getPlacementRouteAuditApi() {
    try { return appPath('placement.routeAudit') || window.__PLACEMENT_ROUTE_AUDIT__ || null; } catch (_) { return window.__PLACEMENT_ROUTE_AUDIT__ || null; }
  }
  function getPlacementEffectsApi() {
    try { return appPath('placement.effects') || window.__PLACEMENT_EFFECTS__ || null; } catch (_) { return window.__PLACEMENT_EFFECTS__ || null; }
  }
  function summarizePlacementEffects(label) {
    try {
      var api = getPlacementEffectsApi();
      if (!api || typeof api.summarize !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarize(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetPlacementEffectsAudit(label) {
    var api = getPlacementEffectsApi();
    if (!api || typeof api.resetAudit !== 'function') return { ok: false, reason: 'missing-placement-effects-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetAudit({ source: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function summarizePlacementRoutes(label) {
    try {
      var routeApi = getPlacementRouteAuditApi();
      if (routeApi && typeof routeApi.summarize === 'function') {
        var routeSummary = routeApi.summarize(String(label || '')) || {};
        routeSummary.label = String(label || '');
        routeSummary.available = true;
        return safeJson(routeSummary);
      }
      var api = getPlacementControllerApi();
      if (!api || typeof api.summarizeRoutes !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarizeRoutes(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetPlacementRouteAudit(label) {
    var routeApi = getPlacementRouteAuditApi();
    if (routeApi && typeof routeApi.resetAudit === 'function') {
      try {
        return { ok: true, summary: safeJson(routeApi.resetAudit({ source: String(label || 'replay') })) };
      } catch (err) {
        return { ok: false, reason: String(err && err.message ? err.message : err) };
      }
    }
    var api = getPlacementControllerApi();
    if (!api || typeof api.resetRouteAudit !== 'function') return { ok: false, reason: 'missing-placement-route-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetRouteAudit({ source: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function resetStateActionsAudit(label) {
    var api = getStateActionsApi();
    if (!api || typeof api.resetAudit !== 'function') return { ok: false, reason: 'missing-reset-audit' };
    try {
      return { ok: true, summary: safeJson(api.resetAudit({ source: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }

  function resetStateActionsBoundary(label) {
    var api = getStateActionsApi();
    if (!api || typeof api.resetBoundaryAudit !== 'function') return { ok: false, reason: 'missing-state-actions-boundary-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetBoundaryAudit({ source: String(label || 'replay'), label: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }


  function getRuntimeRouteAuditApi() {
    try { return appPath('audit.runtimeRoutes') || window.__RUNTIME_ROUTE_AUDIT__ || null; } catch (_) { return window.__RUNTIME_ROUTE_AUDIT__ || null; }
  }
  function summarizeRuntimeRoutes(label) {
    try {
      var api = getRuntimeRouteAuditApi();
      if (!api || typeof api.summarize !== 'function') return { label: String(label || ''), available: false };
      var summary = api.summarize(String(label || '')) || {};
      summary.label = String(label || '');
      summary.available = true;
      return safeJson(summary);
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetRuntimeRouteAudit(label) {
    var api = getRuntimeRouteAuditApi();
    if (!api || typeof api.resetAudit !== 'function') return { ok: false, reason: 'missing-runtime-route-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetAudit({ source: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function getArchitectureLayerAuditApi() {
    try { return appPath('audit.architectureLayers') || window.__ARCHITECTURE_LAYER_AUDIT__ || null; } catch (_) { return window.__ARCHITECTURE_LAYER_AUDIT__ || null; }
  }
  function summarizeArchitectureLayers(label) {
    try {
      var api = getArchitectureLayerAuditApi();
      if (!api) return { label: String(label || ''), available: false };
      if (typeof api.summarize === 'function') {
        var summary = api.summarize(String(label || '')) || {};
        summary.label = String(label || '');
        summary.available = true;
        return safeJson(summary);
      }
      return { label: String(label || ''), available: true, manifest: typeof api.getManifest === 'function' ? safeJson(api.getManifest()) : null };
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }


  function summarizePortableBoundary(label) {
    try {
      var api = appPath('domain.portableCore') || null;
      if (!api || typeof api.summarizeBoundary !== 'function') return { label: String(label || ''), available: false };
      var summary = safeJson(api.summarizeBoundary()) || {};
      summary.label = String(label || '');
      summary.available = true;
      return summary;
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }

  function summarizePlatformBoundary(label) {
    function getService(path) {
      try { return appPath(path) || null; } catch (_) { return null; }
    }
    var sceneWorkflow = getService('services.sceneWorkflow');
    var assetWorkflow = getService('services.assetWorkflow');
    var editorHandoff = getService('services.editorHandoff');
    var prefabApi = getService('services.prefabApi');
    return {
      label: String(label || ''),
      available: !!(sceneWorkflow || assetWorkflow || editorHandoff || prefabApi),
      sceneWorkflow: sceneWorkflow && typeof sceneWorkflow.summarize === 'function' ? safeJson(sceneWorkflow.summarize()) : null,
      assetWorkflow: assetWorkflow && typeof assetWorkflow.summarize === 'function' ? safeJson(assetWorkflow.summarize()) : null,
      editorHandoff: editorHandoff && typeof editorHandoff.summarize === 'function' ? safeJson(editorHandoff.summarize(String(label || ''))) : null,
      prefabApi: prefabApi && typeof prefabApi.summarize === 'function' ? safeJson(prefabApi.summarize(String(label || ''))) : null
    };
  }

  function getSceneSessionApi() {
    try { return appPath('state.sceneSession') || window.__SCENE_SESSION_STATE__ || null; } catch (_) { return window.__SCENE_SESSION_STATE__ || null; }
  }
  function summarizeSceneSession(label) {
    try {
      var api = getSceneSessionApi();
      if (!api) return { label: String(label || ''), available: false };
      return {
        label: String(label || ''),
        available: true,
        session: typeof api.summarizeSession === 'function' ? safeJson(api.summarizeSession()) : null,
        writes: typeof api.summarizeWrites === 'function' ? safeJson(api.summarizeWrites(String(label || ''))) : null
      };
    } catch (err) {
      return { label: String(label || ''), available: false, error: String(err && err.message ? err.message : err) };
    }
  }
  function resetSceneSessionAudit(label) {
    var api = getSceneSessionApi();
    if (!api || typeof api.resetAudit !== 'function') return { ok: false, reason: 'missing-scene-session-reset' };
    try {
      return { ok: true, summary: safeJson(api.resetAudit({ source: String(label || 'replay') })) };
    } catch (err) {
      return { ok: false, reason: String(err && err.message ? err.message : err) };
    }
  }
  function dispatchPlacementAction(action, args, fallbackLabel) {
    args = Array.isArray(args) ? args.slice() : [];
    var result = null;
    var route = 'none';
    var placementController = appPath('controllers.placement');
    try {
      if (window.App && window.App.controllers && typeof window.App.controllers.dispatch === 'function') {
        route = 'controllers.dispatch';
        result = window.App.controllers.dispatch('placement', action, args);
        return { ok: true, route: route, result: safeJson(result) };
      }
      if (placementController && typeof placementController.dispatch === 'function') {
        route = 'controllers.placement.dispatch';
        result = placementController.dispatch(action, args);
        return { ok: true, route: route, result: safeJson(result) };
      }
    } catch (err) {
      return { ok: false, route: route + ':threw', error: String(err && err.message ? err.message : err) };
    }
    var api = getStateActionsApi();
    if (api) {
      try {
        if (action === 'handleModeButton' && typeof api.requestModeChange === 'function') {
          route = 'state.actions.requestModeChange';
          result = api.requestModeChange(args[0], { source: args[1] || fallbackLabel || 'replay:placement-fallback' });
          return { ok: true, route: route, result: safeJson(result) };
        }
        if (action === 'selectPrefabById' && typeof api.selectPrefabById === 'function') {
          route = 'state.actions.selectPrefabById';
          result = api.selectPrefabById(args[0], { source: args[1] || fallbackLabel || 'replay:placement-fallback' });
          return { ok: true, route: route, result: safeJson(result) };
        }
        if (action === 'selectPrefabByIndex' && typeof api.selectPrefabByIndex === 'function') {
          route = 'state.actions.selectPrefabByIndex';
          result = api.selectPrefabByIndex(args[0], { source: args[1] || fallbackLabel || 'replay:placement-fallback' });
          return { ok: true, route: route, result: safeJson(result) };
        }
      } catch (err) {
        return { ok: false, route: route + ':threw', error: String(err && err.message ? err.message : err) };
      }
    }
    return { ok: false, route: 'missing-placement-route', action: action };
  }
  function currentInstancesCount() { try { return Array.isArray(window.instances) ? window.instances.length : 0; } catch (_) { return 0; } }
  async function findPreviewPlacement(prefabId, canvas) {
    var candidates = [];
    for (var y = 0; y < 9; y++) {
      for (var x = 0; x < 11; x++) candidates.push({ x: x, y: y });
    }
    for (var i = 0; i < candidates.length; i++) {
      var cell = candidates[i];
      var p = (typeof iso === 'function') ? iso(cell.x + 0.5, cell.y + 0.5, 0) : { x: canvas.width / 2, y: canvas.height / 2 };
      await moveMouseOnCanvas(canvas, p.x, p.y, { duration: 260 });
      await sleep(140);
      var preview = window.editor && window.editor.preview ? window.editor.preview : null;
      if (preview && preview.valid && (!prefabId || String(preview.prefabId || '') === String(prefabId))) {
        return { ok: true, cell: cell, preview: { prefabId: preview.prefabId || null, origin: preview.origin || null, valid: !!preview.valid } };
      }
    }
    return { ok: false, reason: 'no-valid-preview-found', prefabId: prefabId || null };
  }
  async function flowBaseline(session) {
    var flow = makeFlowResult('01-baseline');
    pushStep(flow, 'bootstrap-wait', {});
    await waitForBootstrap();
    await waitFor(function () {
      var dispatchState = getPlacementDispatchState();
      return !!((dispatchState.hasRootDispatch || dispatchState.hasPlacementDispatch) && getStateActionsApi());
    }, 8000, 'placement-controller-and-state-actions');
    pushStep(flow, 'placement-dispatch-ready', getPlacementDispatchState());
    pushStep(flow, 'counts', { prefabs: Array.isArray(window.prototypes) ? window.prototypes.length : 0, instances: currentInstancesCount(), lights: Array.isArray(window.lights) ? window.lights.length : 0 });
    pushStep(flow, 'state-actions-reset', resetStateActionsAudit('replay:baseline-reset'));
    var stateActionsBoundaryReset = resetStateActionsBoundary('replay:baseline-reset');
    pushStep(flow, 'state-actions-boundary-reset', stateActionsBoundaryReset);
    await saveStateActionsBoundarySnapshot(session, 'reset', 'replay:baseline-reset', { step: 'state-actions-boundary-reset', detail: stateActionsBoundaryReset });
    pushStep(flow, 'application-boundary-reset', resetApplicationBoundary('replay:baseline-reset'));
    pushStep(flow, 'asset-import-boundary-reset', resetAssetImportBoundary('replay:baseline-reset'));
    pushStep(flow, 'placement-boundary-reset', resetPlacementBoundary('replay:baseline-reset'));
    pushStep(flow, 'scene-session-reset', resetSceneSessionAudit('replay:baseline-reset'));
    pushStep(flow, 'placement-route-reset', resetPlacementRouteAudit('replay:baseline-reset'));
    pushStep(flow, 'placement-effects-reset', resetPlacementEffectsAudit('replay:baseline-reset'));
    pushStep(flow, 'runtime-routes-reset', resetRuntimeRouteAudit('replay:baseline-reset'));
    try {
      var selectors = appPath('state.selectors');
      var currentMode = selectors && typeof selectors.getEditorMode === 'function' ? selectors.getEditorMode() : (window.editor ? window.editor.mode : 'view');
      var currentPrefabId = selectors && typeof selectors.getSelectedPrefabId === 'function' ? selectors.getSelectedPrefabId() : null;
      var modeDispatch = dispatchPlacementAction('handleModeButton', [String(currentMode || 'view'), 'replay:baseline-mode-probe'], 'replay:baseline-mode-probe');
      var prefabDispatch = currentPrefabId ? dispatchPlacementAction('selectPrefabById', [String(currentPrefabId), 'replay:baseline-prefab-probe'], 'replay:baseline-prefab-probe') : { ok: true, skipped: true, reason: 'missing-current-prefab-id' };
      pushStep(flow, 'state-actions-probe', { mode: currentMode || null, prefabId: currentPrefabId || null, modeDispatch: modeDispatch, prefabDispatch: prefabDispatch });
    } catch (err) {
      pushStep(flow, 'state-actions-probe-warning', { error: String(err && err.message ? err.message : err) });
    }
    pushStep(flow, 'state-actions-baseline', summarizeStateActions('baseline'));
    var stateActionsBoundaryBaseline = summarizeStateActionsBoundary('baseline');
    pushStep(flow, 'state-actions-boundary-baseline', stateActionsBoundaryBaseline);
    await saveStateActionsBoundarySnapshot(session, 'baseline', 'baseline', { step: 'state-actions-boundary-baseline', detail: stateActionsBoundaryBaseline });
    pushStep(flow, 'application-boundary-baseline', summarizeApplicationBoundary('baseline'));
    pushStep(flow, 'asset-import-boundary-baseline', summarizeAssetImportBoundary('baseline'));
    pushStep(flow, 'placement-boundary-baseline', summarizePlacementBoundary('baseline'));
    pushStep(flow, 'scene-session-baseline', summarizeSceneSession('baseline'));
    pushStep(flow, 'placement-routes-baseline', summarizePlacementRoutes('baseline'));
    pushStep(flow, 'placement-effects-baseline', summarizePlacementEffects('baseline'));
    pushStep(flow, 'runtime-routes-baseline', summarizeRuntimeRoutes('baseline'));
    pushStep(flow, 'architecture-layers-baseline', summarizeArchitectureLayers('baseline'));
    pushStep(flow, 'portable-boundary-baseline', summarizePortableBoundary('baseline'));
    pushStep(flow, 'platform-boundary-baseline', summarizePlatformBoundary('baseline'));
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  function getMainCameraSettings() {
    try {
      var main = appPath('controllers.main');
      if (main && typeof main.getMainEditorCameraSettings === 'function') return main.getMainEditorCameraSettings('replay:camera-read');
    } catch (_) {}
    return null;
  }
  function getMainDiscreteViewRotation() {
    try {
      var main = appPath('controllers.main');
      if (main && typeof main.getMainEditorViewRotation === 'function') return Number(main.getMainEditorViewRotation('replay:camera-discrete')) || 0;
    } catch (_) {}
    return 0;
  }
  function isMainViewRotating() {
    try {
      var main = appPath('controllers.main');
      if (main && typeof main.isMainEditorViewRotating === 'function') return !!main.isMainEditorViewRotating('replay:camera-animating');
    } catch (_) {}
    return false;
  }
  function logMainCameraReplayCheck(detail) {
    try { if (typeof recordItemRotationDiagnostic === 'function') recordItemRotationDiagnostic('main-camera-replay-check', detail || {}); } catch (_) {}
  }
  async function runCameraRotationReplayStep(flow, replayStep, trigger, expectedAfter) {
    var beforeViewRotation = getMainDiscreteViewRotation();
    var beforeSettings = getMainCameraSettings() || {};
    await trigger();
    await waitFor(function () { return !isMainViewRotating(); }, 7000, replayStep + ':rotation-settle');
    var afterViewRotation = getMainDiscreteViewRotation();
    var afterSettings = getMainCameraSettings() || {};
    var passed = Number(afterViewRotation) === Number(expectedAfter);
    var detail = {
      replayStep: replayStep,
      animationEnabled: beforeSettings.rotationAnimationEnabled !== false,
      rotationAnimationMs: Number(beforeSettings.rotationAnimationMs || 0),
      interpolationEnabled: beforeSettings.rotationInterpolationEnabled !== false,
      interpolationMode: String(beforeSettings.rotationInterpolationMode || 'easeInOut'),
      beforeViewRotation: beforeViewRotation,
      afterViewRotation: afterViewRotation,
      passed: passed
    };
    pushStep(flow, replayStep, detail);
    logMainCameraReplayCheck(detail);
    if (!passed) throw new Error('main-camera-replay-check-failed:' + replayStep + ':' + beforeViewRotation + '->' + afterViewRotation + ' expected=' + expectedAfter);
  }

  async function flowMainCameraRotation(session) {
    var flow = makeFlowResult('06-main-camera-rotation');
    var u = ui();
    await clickElement(u.tabCamera, 'tabCamera');
    if (u.mainCameraAnimationEnabled) await setCheckbox(u.mainCameraAnimationEnabled, true, 'mainCameraAnimationEnabled:on');
    if (u.mainCameraAnimationMs) await setInputValue(u.mainCameraAnimationMs, '160', 'mainCameraAnimationMs:160');
    if (u.mainCameraInterpolationEnabled) await setCheckbox(u.mainCameraInterpolationEnabled, true, 'mainCameraInterpolationEnabled:on');
    if (u.mainCameraInterpolationMode) await setSelectValue(u.mainCameraInterpolationMode, 'easeInOut', 'mainCameraInterpolationMode:easeInOut');
    if (u.mainCameraResetView) await clickElement(u.mainCameraResetView, 'mainCameraResetView', { duration: 360, after: 400 });
    await waitFor(function () { return !isMainViewRotating() && getMainDiscreteViewRotation() === 0; }, 6000, 'camera-reset-rotation-0');
    await runCameraRotationReplayStep(flow, 'rotate-right-animated-1', async function () {
      await clickElement(u.mainViewRotateRight, 'mainViewRotateRight#1', { duration: 320, after: 120 });
    }, 1);
    await runCameraRotationReplayStep(flow, 'rotate-right-animated-2', async function () {
      await clickElement(u.mainViewRotateRight, 'mainViewRotateRight#2', { duration: 320, after: 120 });
    }, 2);
    if (u.mainCameraAnimationEnabled) await setCheckbox(u.mainCameraAnimationEnabled, false, 'mainCameraAnimationEnabled:off');
    await runCameraRotationReplayStep(flow, 'rotate-left-discrete-1', async function () {
      await clickElement(u.mainViewRotateLeft, 'mainViewRotateLeft#1', { duration: 280, after: 120 });
    }, 1);
    if (u.mainCameraAnimationEnabled) await setCheckbox(u.mainCameraAnimationEnabled, true, 'mainCameraAnimationEnabled:restore');
    if (u.mainCameraAnimationMs) await setInputValue(u.mainCameraAnimationMs, '320', 'mainCameraAnimationMs:320');
    if (u.mainCameraInterpolationEnabled) await setCheckbox(u.mainCameraInterpolationEnabled, false, 'mainCameraInterpolationEnabled:off');
    await runCameraRotationReplayStep(flow, 'rotate-right-animated-no-interp', async function () {
      await clickElement(u.mainViewRotateRight, 'mainViewRotateRight#3', { duration: 320, after: 120 });
    }, 2);
    if (u.mainCameraInterpolationEnabled) await setCheckbox(u.mainCameraInterpolationEnabled, true, 'mainCameraInterpolationEnabled:on');
    if (u.mainCameraInterpolationMode) await setSelectValue(u.mainCameraInterpolationMode, 'linear', 'mainCameraInterpolationMode:linear');
    await runCameraRotationReplayStep(flow, 'rotate-left-linear', async function () {
      await clickElement(u.mainViewRotateLeft, 'mainViewRotateLeft#2', { duration: 320, after: 120 });
    }, 1);
    if (u.mainCameraInterpolationMode) await setSelectValue(u.mainCameraInterpolationMode, 'easeInOut', 'mainCameraInterpolationMode:restore');
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }

  async function flowHabboOpen(session) {
    var flow = makeFlowResult('02-habbo-root-and-open');
    var u = ui();
    await clickElement(u.tabItems, 'tabItems');
    window.__ACCEPTANCE_REPLAY_CONTEXT__ = Object.assign({}, window.__ACCEPTANCE_REPLAY_CONTEXT__ || {}, { active: true, defaultHabboRoot: DEFAULT_HABBO_ROOT });
    await clickElement(u.setHabboAssetRoot, 'setHabboAssetRoot', { duration: 500, after: 900 });
    await waitFor(function () { return !!window.habboAssetRootState && String(window.habboAssetRootState.root || '') === DEFAULT_HABBO_ROOT; }, 12000, 'habbo-root-set');
    var config = safeJson(window.habboAssetRootState || {});
    pushStep(flow, 'root-set', config);
    await sleep(900);
    await clickElement(u.openHabboLibrary, 'openHabboLibrary');
    await waitFor(function () { return u.habboLibraryModal && !u.habboLibraryModal.classList.contains('hidden'); }, 6000, 'habbo-library-modal');
    await waitFor(function () { return document.querySelector('[data-category-card]') || document.querySelector('[data-category-key]') || document.querySelector('[data-asset-id]'); }, 12000, 'habbo-library-list');
    var firstCategory = document.querySelector('[data-category-card]') || document.querySelector('[data-category-key]');
    if (firstCategory) {
      await clickElement(firstCategory, 'habbo-first-category', { duration: 520, after: 500 });
      await waitFor(function () { return !!document.querySelector('[data-asset-id]'); }, 12000, 'habbo-first-page-items');
      pushStep(flow, 'first-category', { text: (firstCategory.textContent || '').trim().slice(0, 80) });
    }
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  async function flowHabboPlace(session) {
    var flow = makeFlowResult('03-habbo-first-item-place');
    var u = ui();
    var item = document.querySelector('[data-asset-id]');
    if (!item) throw new Error('missing-first-habbo-item');
    var beforeInstances = currentInstancesCount();
    await clickElement(item, 'habbo-first-item', { duration: 520, after: 500 });
    await clickElement(u.habboLibraryPlace, 'habboLibraryPlace', { duration: 520, after: 800 });
    await waitFor(function () { return window.editor && String(window.editor.mode || '') === 'place'; }, 6000, 'editor-place-mode-after-habbo');
    var selectedPrefabId = appPath('state.selectors') && typeof appPath('state.selectors').getSelectedPrefabId === 'function' ? appPath('state.selectors').getSelectedPrefabId() : null;
    var target = await findPreviewPlacement(selectedPrefabId, window.canvas);
    pushStep(flow, 'preview-target', target);
    if (!target.ok) throw new Error(target.reason || 'missing-preview-target');
    var pt = (typeof iso === 'function') ? iso(target.cell.x + 0.5, target.cell.y + 0.5, 0) : { x: window.canvas.width / 2, y: window.canvas.height / 2 };
    await clickCanvas(window.canvas, pt.x, pt.y, 'place-habbo-item', { duration: 360, after: 600 });
    await waitFor(function () { return currentInstancesCount() > beforeInstances; }, 6000, 'habbo-item-placed');
    pushStep(flow, 'placed', { beforeInstances: beforeInstances, afterInstances: currentInstancesCount(), selectedPrefabId: selectedPrefabId });
    pushStep(flow, 'state-actions-after-habbo-place', summarizeStateActions('after-habbo-place'));
    var stateActionsBoundaryAfterHabboPlace = summarizeStateActionsBoundary('after-habbo-place');
    pushStep(flow, 'state-actions-boundary-after-habbo-place', stateActionsBoundaryAfterHabboPlace);
    await saveStateActionsBoundarySnapshot(session, 'after-habbo-place', 'after-habbo-place', { step: 'state-actions-boundary-after-habbo-place', detail: stateActionsBoundaryAfterHabboPlace });
    pushStep(flow, 'application-boundary-after-habbo-place', summarizeApplicationBoundary('after-habbo-place'));
    pushStep(flow, 'asset-import-boundary-after-habbo-place', summarizeAssetImportBoundary('after-habbo-place'));
    pushStep(flow, 'placement-boundary-after-habbo-place', summarizePlacementBoundary('after-habbo-place'));
    pushStep(flow, 'scene-session-after-habbo-place', summarizeSceneSession('after-habbo-place'));
    pushStep(flow, 'placement-routes-after-habbo-place', summarizePlacementRoutes('after-habbo-place'));
    pushStep(flow, 'placement-effects-after-habbo-place', summarizePlacementEffects('after-habbo-place'));
    pushStep(flow, 'runtime-routes-after-habbo-place', summarizeRuntimeRoutes('after-habbo-place'));
    pushStep(flow, 'architecture-layers-after-habbo-place', summarizeArchitectureLayers('after-habbo-place'));
    pushStep(flow, 'portable-boundary-after-habbo-place', summarizePortableBoundary('after-habbo-place'));
    pushStep(flow, 'platform-boundary-after-habbo-place', summarizePlatformBoundary('after-habbo-place'));
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  async function flowEditorNormalHealth(session) {
    var flow = makeFlowResult('08-editor-normal-health');
    var u = ui();
    clearEditorHealthResult(session.id);
    var openEditorHref = 'START_V18_ONLY.html?fromMain=1&healthCheck=1&replaySession=' + encodeURIComponent(session.id);
    try { window.__ACCEPTANCE_REPLAY_CONTEXT__ = Object.assign({}, window.__ACCEPTANCE_REPLAY_CONTEXT__ || {}, { active: true, openEditorHref: openEditorHref, defaultHabboRoot: DEFAULT_HABBO_ROOT }); } catch (_) {}
    pushStep(flow, 'navigate-editor-health', { sessionId: session.id, href: openEditorHref, nonBlocking: true });
    await clickElement(u.openEditor, 'openEditorHealth', { duration: 520, after: 350 });
    var result = null;
    try {
      await waitFor(function () { return !!getEditorHealthResult(session.id); }, 5000, 'editor-health-result');
      result = getEditorHealthResult(session.id) || {};
      pushStep(flow, 'editor-health-result', result);
      flow.ok = !!result.ok && String(result.tag || '') === 'ready';
      if (!flow.ok) pushStep(flow, 'non-blocking-health-failure', { tag: String(result.tag || 'unknown'), reason: 'editor-normal-health-failed' });
    } catch (err) {
      result = { ok: false, tag: 'timeout-5000ms', error: String((err && err.message) || err || 'editor-health-timeout') };
      pushStep(flow, 'editor-health-timeout', result);
      flow.ok = false;
    }
    try { if (window.__ACCEPTANCE_REPLAY_CONTEXT__) window.__ACCEPTANCE_REPLAY_CONTEXT__.openEditorHref = ''; } catch (_) {}
    await saveFlowReport(session, flow);
    return flow;
  }

  async function flowEditorRoundtrip(session) {
    var flow = makeFlowResult('04-editor-x5-save-return-place');
    var u = ui();
    var params = new URLSearchParams(location.search || '');
    if (!session.substage || session.substage === 'editor-open') {
      session.substage = 'editor-return';
      session.currentIndex = 3;
      setSession(session);
      var openEditorHref = 'AUTO_EDITOR_SAVE_X5.html?fromMain=1&autoScenario=save-x5&replaySession=' + encodeURIComponent(session.id);
      window.__ACCEPTANCE_REPLAY_CONTEXT__ = Object.assign({}, window.__ACCEPTANCE_REPLAY_CONTEXT__ || {}, { active: true, openEditorHref: openEditorHref, defaultHabboRoot: DEFAULT_HABBO_ROOT });
      pushStep(flow, 'navigate-editor', { sessionId: session.id, href: openEditorHref, deferred: true });
      flow.pending = true;
      await saveFlowReport(session, flow);
      await clickElement(u.openEditor, 'openEditor', { duration: 520, after: 300 });
      return { deferred: true };
    }
    var returnedPrefabId = params.get('prefabId') || '';
    var returnReason = params.get('reason') || '';
    pushStep(flow, 'returned-main', { prefabId: returnedPrefabId, reason: returnReason, href: String(location.href) });
    if (returnReason === 'scenario-editor-timeout') throw new Error('editor-auto-scenario-timeout');
    await waitFor(function () {
      return !!returnedPrefabId || (appPath('state.selectors') && typeof appPath('state.selectors').getSelectedPrefabId === 'function' && String(appPath('state.selectors').getSelectedPrefabId() || '').indexOf('auto_x5_') === 0);
    }, 12000, 'editor-return-prefab');
    if (!returnedPrefabId && appPath('state.selectors') && typeof appPath('state.selectors').getSelectedPrefabId === 'function') returnedPrefabId = appPath('state.selectors').getSelectedPrefabId() || '';
    await waitFor(function () { return window.editor && String(window.editor.mode || '') === 'place'; }, 8000, 'editor-return-place-mode');
    var beforeInstances = currentInstancesCount();
    var target = await findPreviewPlacement(returnedPrefabId, window.canvas);
    pushStep(flow, 'preview-target', target);
    if (!target.ok) throw new Error(target.reason || 'missing-preview-target-editor-return');
    var pt = (typeof iso === 'function') ? iso(target.cell.x + 0.5, target.cell.y + 0.5, 0) : { x: window.canvas.width / 2, y: window.canvas.height / 2 };
    await clickCanvas(window.canvas, pt.x, pt.y, 'place-editor-x5', { duration: 360, after: 650 });
    await waitFor(function () { return currentInstancesCount() > beforeInstances; }, 6000, 'editor-x5-placed');
    pushStep(flow, 'placed', { beforeInstances: beforeInstances, afterInstances: currentInstancesCount(), prefabId: returnedPrefabId });
    try {
      var mainController = appPath('controllers.main');
      if (mainController && typeof mainController.requestModeChange === 'function') mainController.requestModeChange('view', { source: 'replay:post-editor-place' });
      else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('view', { source: 'replay:post-editor-place' });
      else if (typeof setEditorMode === 'function') setEditorMode('view', { source: 'replay:post-editor-place' });
      if (u && u.modeView) await clickElement(u.modeView, 'modeViewAfterEditorPlace', { duration: 360, after: 220 });
      await waitFor(function () { return window.editor && String(window.editor.mode || '') === 'view'; }, 3000, 'editor-return-view-mode');
      if (window.editor) window.editor.preview = null;
      try {
        var selectorApi = appPath('state.selectors');
        var selectedAfter = selectorApi && typeof selectorApi.getSelectedPrefabId === 'function' ? selectorApi.getSelectedPrefabId() : null;
        pushStep(flow, 'exit-place-mode', { mode: window.editor && window.editor.mode ? String(window.editor.mode) : null, selectedPrefabId: selectedAfter });
      } catch (_) {
        pushStep(flow, 'exit-place-mode', { mode: window.editor && window.editor.mode ? String(window.editor.mode) : null });
      }
    } catch (exitErr) {
      pushStep(flow, 'exit-place-mode-warning', { error: String(exitErr && exitErr.message ? exitErr.message : exitErr), mode: window.editor && window.editor.mode ? String(window.editor.mode) : null });
    }
    pushStep(flow, 'state-actions-after-editor-roundtrip', summarizeStateActions('after-editor-roundtrip'));
    var stateActionsBoundaryAfterEditorRoundtrip = summarizeStateActionsBoundary('after-editor-roundtrip');
    pushStep(flow, 'state-actions-boundary-after-editor-roundtrip', stateActionsBoundaryAfterEditorRoundtrip);
    await saveStateActionsBoundarySnapshot(session, 'after-editor-roundtrip', 'after-editor-roundtrip', { step: 'state-actions-boundary-after-editor-roundtrip', detail: stateActionsBoundaryAfterEditorRoundtrip });
    pushStep(flow, 'application-boundary-after-editor-roundtrip', summarizeApplicationBoundary('after-editor-roundtrip'));
    pushStep(flow, 'asset-import-boundary-after-editor-roundtrip', summarizeAssetImportBoundary('after-editor-roundtrip'));
    pushStep(flow, 'placement-boundary-after-editor-roundtrip', summarizePlacementBoundary('after-editor-roundtrip'));
    pushStep(flow, 'scene-session-after-editor-roundtrip', summarizeSceneSession('after-editor-roundtrip'));
    pushStep(flow, 'placement-routes-after-editor-roundtrip', summarizePlacementRoutes('after-editor-roundtrip'));
    pushStep(flow, 'placement-effects-after-editor-roundtrip', summarizePlacementEffects('after-editor-roundtrip'));
    pushStep(flow, 'runtime-routes-after-editor-roundtrip', summarizeRuntimeRoutes('after-editor-roundtrip'));
    pushStep(flow, 'architecture-layers-after-editor-roundtrip', summarizeArchitectureLayers('after-editor-roundtrip'));
    session.substage = null;
    try { if (window.__ACCEPTANCE_REPLAY_CONTEXT__) window.__ACCEPTANCE_REPLAY_CONTEXT__.openEditorHref = ''; } catch (_) {}
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  async function flowSceneSaveLoad(session) {
    var flow = makeFlowResult('05-scene-save-load');
    var u = ui();
    await clickElement(u.tabWorld, 'tabWorld');
    var beforeInstances = currentInstancesCount();
    await clickElement(u.saveScene, 'saveScene', { duration: 460, after: 700 });
    await clickElement(u.tabItems, 'tabItems');
    var cubeIndex = 0;
    if (u.prefabSelect) {
      for (var i = 0; i < u.prefabSelect.options.length; i++) {
        if (String(u.prefabSelect.options[i].textContent || '').indexOf('Cube') >= 0 || String(u.prefabSelect.options[i].value || '') === '0') { cubeIndex = i; break; }
      }
      await setSelectValue(u.prefabSelect, String(cubeIndex), 'prefabSelectCube');
    }
    await clickElement(u.modePlace, 'modePlaceCube', { duration: 420, after: 260 });
    var beforePlaceInstances = currentInstancesCount();
    var target = await findPreviewPlacement(null, window.canvas);
    pushStep(flow, 'preview-target', target);
    if (target.ok) {
      var pt = (typeof iso === 'function') ? iso(target.cell.x + 0.5, target.cell.y + 0.5, 0) : { x: window.canvas.width / 2, y: window.canvas.height / 2 };
      await clickCanvas(window.canvas, pt.x, pt.y, 'place-temp-cube', { duration: 320, after: 500 });
      await waitFor(function () { return currentInstancesCount() > beforePlaceInstances; }, 5000, 'temp-cube-placed');
    }
    await clickElement(u.tabWorld, 'tabWorldLoad');
    await clickElement(u.loadScene, 'loadScene', { duration: 460, after: 900 });
    await waitFor(function () { return currentInstancesCount() === beforeInstances; }, 6000, 'scene-restored-instance-count');
    pushStep(flow, 'restored', { beforeInstances: beforeInstances, afterInstances: currentInstancesCount() });
    var stateActionsBoundaryAfterSceneSaveLoad = summarizeStateActionsBoundary('after-scene-save-load');
    pushStep(flow, 'state-actions-boundary-after-scene-save-load', stateActionsBoundaryAfterSceneSaveLoad);
    await saveStateActionsBoundarySnapshot(session, 'after-scene-save-load', 'after-scene-save-load', { step: 'state-actions-boundary-after-scene-save-load', detail: stateActionsBoundaryAfterSceneSaveLoad });
    pushStep(flow, 'application-boundary-after-scene-save-load', summarizeApplicationBoundary('after-scene-save-load'));
    pushStep(flow, 'placement-boundary-after-scene-save-load', summarizePlacementBoundary('after-scene-save-load'));
    pushStep(flow, 'platform-boundary-after-scene-save-load', summarizePlatformBoundary('after-scene-save-load'));
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  async function flowLighting(session) {
    var flow = makeFlowResult('06-lighting-visual-replay');
    var u = ui();
    try {
      var mainController = appPath('controllers.main');
      if (mainController && typeof mainController.requestModeChange === 'function') mainController.requestModeChange('view', { source: 'replay:lighting-prep' });
      else if (typeof requestEditorModeChange === 'function') requestEditorModeChange('view', { source: 'replay:lighting-prep' });
      if (u.modeView) await clickElement(u.modeView, 'modeViewBeforeLighting', { duration: 320, after: 180 });
      await waitFor(function () { return window.editor && String(window.editor.mode || '') === 'view'; }, 3000, 'lighting-view-mode');
      if (window.editor) window.editor.preview = null;
      pushStep(flow, 'pre-lighting-view-mode', { mode: window.editor && window.editor.mode ? String(window.editor.mode) : null });
    } catch (prepErr) {
      pushStep(flow, 'pre-lighting-view-mode-warning', { error: String(prepErr && prepErr.message ? prepErr.message : prepErr), mode: window.editor && window.editor.mode ? String(window.editor.mode) : null });
    }
    await clickElement(u.tabLights, 'tabLights');
    await setRange(u.shadowAlpha, 1.60, 'shadowAlphaMax');
    await setRange(u.shadowOpacity, 3.00, 'shadowOpacityMax');
    await setCheckbox(u.shadowDistanceFadeEnabled, true, 'shadowDistanceFadeEnabled');
    await setRange(u.shadowDistanceFadeRate, 1.50, 'shadowDistanceFadeRateMax');
    await setRange(u.shadowDistanceFadeMin, 0.18, 'shadowDistanceFadeMin');
    await setCheckbox(u.shadowEdgeFadeEnabled, true, 'shadowEdgeFadeEnabled');
    await setRange(u.shadowEdgeFadePx, 20.0, 'shadowEdgeFadePxMax');
    await setCheckbox(u.showLightShadows, true, 'showLightShadows');
    await setCheckbox(u.showLightGlow, true, 'showLightGlow');
    await setCheckbox(u.shadowHighContrast, true, 'shadowHighContrast');
    if (u.lightType) await setSelectValue(u.lightType, 'point', 'lightTypePoint');
    if (u.lightList) {
      var firstLight = u.lightList.querySelector('.lightItem') || u.lightList.firstElementChild;
      if (firstLight) await clickElement(firstLight, 'firstLightItem', { duration: 520, after: 300 });
    }
    await sleep(700);
    var beforeX = u.lightXInput ? Number(u.lightXInput.value || 0) : null;
    var beforeY = u.lightYInput ? Number(u.lightYInput.value || 0) : null;
    var beforeZ = u.lightZInput ? Number(u.lightZInput.value || 0) : null;
    pushStep(flow, 'light-position-before', { x: beforeX, y: beforeY, z: beforeZ });
    if (u.lightXInput) await setInputValue(u.lightXInput, String((Number(u.lightXInput.value || 0) + 1.4).toFixed(2)), 'lightX+');
    if (u.lightYInput) await setInputValue(u.lightYInput, String((Number(u.lightYInput.value || 0) - 0.9).toFixed(2)), 'lightY-');
    if (u.lightZInput) await setInputValue(u.lightZInput, String((Number(u.lightZInput.value || 0) + 1.2).toFixed(2)), 'lightZ+');
    await sleep(900);
    if (u.lightXInput) await setInputValue(u.lightXInput, String((Number(u.lightXInput.value || 0) - 0.6).toFixed(2)), 'lightX-settle');
    if (u.lightYInput) await setInputValue(u.lightYInput, String((Number(u.lightYInput.value || 0) + 0.4).toFixed(2)), 'lightY-settle');
    await sleep(900);
    pushStep(flow, 'light-position-after', { x: u.lightXInput ? Number(u.lightXInput.value || 0) : null, y: u.lightYInput ? Number(u.lightYInput.value || 0) : null, z: u.lightZInput ? Number(u.lightZInput.value || 0) : null });
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  async function flowPlayerWalk(session) {
    var flow = makeFlowResult('07-player-walk');
    var before = { x: Number(window.player && window.player.x || 0), y: Number(window.player && window.player.y || 0) };
    pushStep(flow, 'before', before);
    await holdKey('ArrowRight', 1100);
    await holdKey('ArrowDown', 900);
    var after = { x: Number(window.player && window.player.x || 0), y: Number(window.player && window.player.y || 0) };
    pushStep(flow, 'after', after);
    if (after.x === before.x && after.y === before.y) throw new Error('player-not-moved');
    flow.ok = true;
    await saveFlowReport(session, flow);
    return flow;
  }
  var FLOWS = [flowBaseline, flowHabboOpen, flowHabboPlace, flowEditorRoundtrip, flowSceneSaveLoad, flowMainCameraRotation, flowLighting, flowPlayerWalk, flowEditorNormalHealth];
  async function saveSummary(session, results, statusText) {
    return saveAcceptanceSummaryArtifacts(session, results, statusText);
  }
  async function runAcceptanceReplay(options) {
    options = options || {};
    if (currentRun && currentRun.running) return false;
    var existing = getSession();
    var session = existing && existing.running ? existing : { id: String(Date.now()), running: true, currentIndex: 0, substage: null, scenarioNames: ['baseline', 'habbo-root-open', 'habbo-first-place', 'editor-x5-roundtrip', 'scene-save-load', 'main-camera-rotation', 'lighting-visual', 'player-walk', 'editor-normal-health'] };
    currentRun = { running: true, stopRequested: false, sessionId: session.id };
    setSession(session);
    if (!(existing && existing.running) && !options.resumed) setStoredReports([]);
    ensureOverlay();
    log('start', { sessionId: session.id, scenarios: session.scenarioNames });
    var results = getStoredReports();
    try {
      await waitForBootstrap();
      for (var i = session.currentIndex || 0; i < FLOWS.length; i++) {
        session.currentIndex = i;
        setSession(session);
        if (currentRun.stopRequested) throw new Error('replay-stopped');
        setStatus('验收回放：正在执行 ' + (i + 1) + '/' + FLOWS.length + ' · ' + session.scenarioNames[i]);
        var result = await FLOWS[i](session);
        if (result && result.deferred) return true;
        results = getStoredReports();
      }
      session.running = false;
      session.currentIndex = FLOWS.length;
      setSession(session);
      var summary = await saveSummary(session, results, 'done');
      setStatus('验收回放完成：通过 ' + summary.summary.passed + ' / ' + summary.summary.total + '，报告已保存到 logs/self-check。');
      hidePointer();
      clearSession();
      try { window.__ACCEPTANCE_REPLAY_CONTEXT__ = null; } catch (_) {}
      currentRun = null;
      return true;
    } catch (err) {
      results = getStoredReports();
      session.running = false;
      setSession(session);
      await saveSummary(session, results, 'failed:' + String(err && err.message ? err.message : err));
      setStatus('验收回放失败：' + (err && err.message ? err.message : err) + '。报告已保存到 logs/self-check。');
      try { window.__ACCEPTANCE_REPLAY_CONTEXT__ = null; } catch (_) {}
      currentRun = null;
      return false;
    }
  }
  function stopAcceptanceReplay() {
    if (currentRun) currentRun.stopRequested = true;
    setStatus('验收回放：收到停止请求。');
  }
  function getLastReports() { return getStoredReports(); }
  function bindUi() {
    var u = ui();
    if (!u || typeof safeListen !== 'function') return false;
    safeListen(u.runAcceptanceReplay, 'click', function () { runAcceptanceReplay({ auto: false }); }, 'replay:run');
    safeListen(u.stopAcceptanceReplay, 'click', function () { stopAcceptanceReplay(); }, 'replay:stop');
    return true;
  }
  async function autoResumeIfNeeded() {
    var session = getSession();
    if (!session || !session.running) return;
    if (session.substage === 'editor-return' && (location.search || '').indexOf('prefabId=') < 0 && !readQueryFlag('fromEditor')) return;
    setTimeout(function () { runAcceptanceReplay({ resumed: true }); }, 900);
  }
  var api = { phase: PHASE, owner: OWNER, runAcceptanceReplay: runAcceptanceReplay, stopAcceptanceReplay: stopAcceptanceReplay, getLastReports: getLastReports, defaultHabboRoot: DEFAULT_HABBO_ROOT };
  bindApi('debug.scenarioRunner', api);
  window.addEventListener('load', function () {
    bindUi();
    if (readQueryFlag('acceptanceReplay')) setTimeout(function () { runAcceptanceReplay({ auto: true }); }, 1200);
    else autoResumeIfNeeded();
  });
})();
