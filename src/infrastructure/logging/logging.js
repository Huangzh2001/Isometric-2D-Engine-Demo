// centralized logging helpers extracted from state.js
// 注意：保持旧的全局函数名可用，以最小风险完成日志系统抽离。

var startupIssues = [];
var bootBuffer = [];
var logSeq = 0;
var logs = [];
var logSystemReady = false;
var LOG_UI_FLUSH_MS = 250;
var MAX_LOG_LINES = 200000;
var LOG_UI_PREVIEW_LINES = 2000;
var logFlushScheduled = false;
var lastLogUiFlushAt = 0;
var verboseLog = false;
var shadowDebugDetailed = false;
var shadowDebugFrameStats = { frame: -1, count: 0, suppressed: 0, limit: 20000 };
var habboDebugFrames = [];
var habboDebugSeq = 0;
var habboDebugMax = 800;
var __loggingBootSeq = 0;
var __loggingUi = null;

function bindLoggingUi(nextUi) {
  __loggingUi = nextUi || null;
  if (typeof window !== 'undefined' && nextUi) window.__loggingUi = nextUi;
  return __loggingUi;
}

function getLoggingUi() {
  if (typeof ui !== 'undefined' && ui) return ui;
  if (typeof window !== 'undefined' && window.__loggingUi) return window.__loggingUi;
  return __loggingUi;
}

function detectAppEntryInfo() {
  var explicit = (typeof window !== 'undefined' && window.__APP_ENTRY_INFO && typeof window.__APP_ENTRY_INFO === 'object') ? window.__APP_ENTRY_INFO : null;
  var pathname = '';
  try { pathname = String((typeof location !== 'undefined' && location.pathname) || ''); } catch (err) { pathname = ''; }
  var file = pathname.split('/').pop() || 'unknown';
  var inferredKind = explicit && explicit.kind ? String(explicit.kind) : (/START_V\d+_ONLY\.html$/i.test(file) ? 'editor' : (/index\.html$/i.test(file) ? 'main' : 'other'));
  var inferredLabel = explicit && explicit.label ? String(explicit.label) : (inferredKind === 'main' ? '主程序' : (inferredKind === 'editor' ? '编辑器' : '其它入口'));
  var launcher = explicit && explicit.launcherHint ? String(explicit.launcherHint) : (inferredKind === 'main' ? 'start.bat' : (inferredKind === 'editor' ? 'start_editor.bat' : 'unknown'));
  var href = '';
  try { href = String((typeof location !== 'undefined' && location.href) || ''); } catch (err) { href = ''; }
  return {
    kind: inferredKind,
    label: inferredLabel,
    entryFile: explicit && explicit.entryFile ? String(explicit.entryFile) : file,
    launcherHint: launcher,
    title: (typeof document !== 'undefined' && document.title) ? String(document.title) : '',
    href: href,
    build: explicit && explicit.build ? String(explicit.build) : '',
    source: explicit ? 'html-global' : 'pathname-inferred'
  };
}

var APP_ENTRY_INFO = detectAppEntryInfo();
if (typeof window !== 'undefined') window.__APP_ENTRY_INFO_RESOLVED = APP_ENTRY_INFO;


var __REFACTOR_LOG_STATE = {
  step: 'legacy',
  startedAt: new Date().toISOString(),
  startedPerf: (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') ? performance.now() : 0,
  stepMeta: null,
  checkpoints: [],
  compatMappings: [],
  fallbacks: []
};
if (typeof window !== 'undefined') window.__REFACTOR_LOG_STATE = __REFACTOR_LOG_STATE;

function stringifyRefactorExtra(extra) {
  if (typeof extra === 'undefined') return '';
  try {
    return ' ' + (typeof extra === 'string' ? extra : JSON.stringify(extra));
  } catch (err) {
    return ' [extra-unserializable]';
  }
}

function refactorLog(step, scope, message, extra) {
  var stepText = String(step || (__REFACTOR_LOG_STATE && __REFACTOR_LOG_STATE.step) || 'unknown');
  var scopeText = String(scope || 'General');
  var line = '[Refactor][' + stepText + '][' + scopeText + '] ' + String(message || '') + stringifyRefactorExtra(extra);
  try { if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
  try { if (typeof pushLog === 'function') pushLog(line); } catch (_) {}
  return line;
}

function refactorLogCurrent(scope, message, extra) {
  return refactorLog((__REFACTOR_LOG_STATE && __REFACTOR_LOG_STATE.step) || 'unknown', scope, message, extra);
}

function setRefactorStep(step, meta) {
  __REFACTOR_LOG_STATE.step = String(step || 'unknown');
  __REFACTOR_LOG_STATE.stepMeta = (typeof meta === 'undefined') ? null : meta;
  refactorLog(__REFACTOR_LOG_STATE.step, 'Bootstrap', 'step registered', meta || null);
  return __REFACTOR_LOG_STATE.step;
}

function markRefactorCheckpoint(scope, message, extra) {
  var entry = {
    seq: __REFACTOR_LOG_STATE.checkpoints.length + 1,
    at: new Date().toISOString(),
    perf: (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') ? performance.now() : 0,
    step: (__REFACTOR_LOG_STATE && __REFACTOR_LOG_STATE.step) || 'unknown',
    scope: String(scope || 'General'),
    message: String(message || ''),
    extra: (typeof extra === 'undefined') ? null : extra
  };
  __REFACTOR_LOG_STATE.checkpoints.push(entry);
  refactorLog(entry.step, entry.scope, entry.message, entry.extra);
  return entry;
}

function logCompatMapping(name, target, extra) {
  var entry = { name: String(name || ''), target: String(target || ''), extra: (typeof extra === 'undefined') ? null : extra };
  __REFACTOR_LOG_STATE.compatMappings.push(entry);
  return refactorLogCurrent('Compat', entry.name + ' mapped -> ' + entry.target, entry.extra);
}

function logCompatFallback(name, extra) {
  var entry = { name: String(name || ''), extra: (typeof extra === 'undefined') ? null : extra };
  __REFACTOR_LOG_STATE.fallbacks.push(entry);
  return refactorLogCurrent('Compat', 'fallback -> ' + entry.name, entry.extra);
}

function rawBootLog(msg, kind) {
  kind = kind || 'error';
  var line = '[boot-' + String(++__loggingBootSeq).padStart(4, '0') + '] ' + msg;
  try {
    if (typeof console !== 'undefined' && console[kind === 'error' ? 'error' : 'log']) console[kind === 'error' ? 'error' : 'log'](line);
  } catch (_) {}
  var localUi = getLoggingUi();
  var el = localUi && localUi.debugLog ? localUi.debugLog : null;
  if (el) {
    el.value += (el.value ? '\n' : '') + line;
    el.scrollTop = el.scrollHeight;
  }
}

function noteStartupIssue(msg) {
  startupIssues.push(msg);
  rawBootLog('[startup-issue] ' + msg, 'error');
}

function detailLog(msg) {
  if (!verboseLog) return;
  if (!logSystemReady) {
    bootBuffer.push(String(msg));
    return;
  }
  if (typeof pushLog === 'function') pushLog(String(msg));
}

function logInfo(msg) {
  if (typeof pushLog === 'function') pushLog(String(msg));
}

function logWarn(msg) {
  var line = '[warn] ' + String(msg);
  if (typeof pushLog === 'function') pushLog(line);
  try { if (typeof console !== 'undefined' && console.warn) console.warn(line); } catch (_) {}
}

function logError(msg) {
  var line = '[error] ' + String(msg);
  if (typeof pushLog === 'function') pushLog(line);
  try { if (typeof console !== 'undefined' && console.error) console.error(line); } catch (_) {}
}


function resetShadowDebugFrame(frame) {
  if (shadowDebugFrameStats.frame === frame) return;
  if (shadowDebugFrameStats.frame >= 0 && shadowDebugFrameStats.suppressed > 0) {
    rawBootLog('[shadowdbg-summary] frame=' + shadowDebugFrameStats.frame + ' suppressed=' + shadowDebugFrameStats.suppressed, 'log');
  }
  shadowDebugFrameStats.frame = frame;
  shadowDebugFrameStats.count = 0;
  shadowDebugFrameStats.suppressed = 0;
}

function shadowDebugLog(msg, force) {
  force = !!force;
  if (!verboseLog) return;
  if (!shadowDebugDetailed && !force) return;
  var frame = (typeof debugState !== 'undefined' && debugState && typeof debugState.frame === 'number') ? debugState.frame : -1;
  resetShadowDebugFrame(frame);
  if (!force && shadowDebugFrameStats.count >= shadowDebugFrameStats.limit) {
    shadowDebugFrameStats.suppressed += 1;
    return;
  }
  shadowDebugFrameStats.count += 1;
  if (typeof pushLog === 'function') pushLog('[shadowdbg] ' + String(msg));
  else rawBootLog('[shadowdbg] ' + String(msg), 'log');
}

function logRoute(scope, event, payload) {
  if (!verboseLog) return;
  var msg = '[route][' + String(scope || 'unknown') + '] ' + String(event || '');
  if (typeof payload !== 'undefined') {
    try {
      var extra = typeof payload === 'string' ? payload : JSON.stringify(payload);
      if (extra) msg += ' ' + extra;
    } catch (_) {
      msg += ' [payload-unserializable]';
    }
  }
  if (typeof pushLog === 'function') pushLog(msg);
  else rawBootLog(msg, 'log');
}

function logFailFast(tag, message, extra) {
  var msg = '[' + String(tag || 'FAIL-FAST') + '] ' + String(message || '');
  if (typeof extra !== 'undefined') {
    try {
      var detail = typeof extra === 'string' ? extra : JSON.stringify(extra);
      if (detail) msg += ' ' + detail;
    } catch (_) {}
  }
  try { if (typeof pushLog === 'function') pushLog(msg); } catch (_) {}
  try { if (typeof console !== 'undefined' && console.error) console.error(msg); } catch (_) {}
  return msg;
}

function habboTrace(msg) {
  detailLog('[habbo-trace] ' + msg);
}

function placeTrace(msg) {
  detailLog('[place-trace] ' + msg);
}

function summarizeHabboDebugPayload(event, payload) {
  var safe = payload ? cloneJsonSafe(payload) : null;
  if (!safe || typeof safe !== 'object') return safe;
  if (event === 'prefab-built' && safe.habboMeta) {
    var layerDirs = safe.habboMeta.layersByDirection || {};
    var layerSummary = Object.keys(layerDirs).reduce(function (acc, key) {
      acc[key] = Array.isArray(layerDirs[key]) ? layerDirs[key].length : 0;
      return acc;
    }, {});
    safe.habboMeta = {
      sourceKind: safe.habboMeta.sourceKind || '',
      sourceName: safe.habboMeta.sourceName || '',
      type: safe.habboMeta.type || '',
      dimensions: safe.habboMeta.dimensions || null,
      proxyDims: safe.habboMeta.proxyDims || null,
      logicDirections: safe.habboMeta.logicDirections || [],
      visualDirections: safe.habboMeta.visualDirections || [],
      visualization: safe.habboMeta.visualization || '',
      logic: safe.habboMeta.logic || '',
      scutiReference: safe.habboMeta.scutiReference || null,
      layerDirCounts: layerSummary,
      usesFlattenedFrame: !!safe.habboMeta.usesFlattenedFrame
    };
  }
  return safe;
}

function pushHabboDebug(event, payload) {
  var safePayload = summarizeHabboDebugPayload(String(event || 'unknown'), payload);
  var entry = {
    seq: ++habboDebugSeq,
    ts: Date.now(),
    event: String(event || 'unknown'),
    payload: safePayload
  };
  habboDebugFrames.push(entry);
  if (habboDebugFrames.length > habboDebugMax) habboDebugFrames.shift();
  try {
    var text = JSON.stringify(entry.payload || {});
    if (text && text.length > 3200) text = text.slice(0, 3200) + '…[truncated]';
    detailLog('[habbo-debug] ' + entry.event + ' ' + text);
  } catch (err) {
    detailLog('[habbo-debug] ' + entry.event + ' [payload stringify failed]');
  }
  return entry;
}

function exportHabboDebug() {
  pushHabboDebug('export', { entries: habboDebugFrames.length });
  var blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), entries: habboDebugFrames }, null, 2)], { type: 'application/json;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'habbo-debug-' + Date.now() + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function buildLogExportHeader() {
  var parts = [];
  parts.push('# isometric debug log');
  parts.push('# exportedAt=' + new Date().toISOString());
  parts.push('# entryKind=' + String(APP_ENTRY_INFO.kind || 'unknown'));
  parts.push('# entryLabel=' + String(APP_ENTRY_INFO.label || 'unknown'));
  parts.push('# entryFile=' + String(APP_ENTRY_INFO.entryFile || 'unknown'));
  parts.push('# launcher=' + String(APP_ENTRY_INFO.launcherHint || 'unknown'));
  parts.push('# entrySource=' + String(APP_ENTRY_INFO.source || 'unknown'));
  if (APP_ENTRY_INFO.build) parts.push('# build=' + APP_ENTRY_INFO.build);
  if (APP_ENTRY_INFO.title) parts.push('# title=' + APP_ENTRY_INFO.title);
  if (APP_ENTRY_INFO.href) parts.push('# href=' + APP_ENTRY_INFO.href);
  if (typeof window !== 'undefined' && window.__FUNCTION_TRACE_INFO) parts.push('# functionTrace=' + JSON.stringify(window.__FUNCTION_TRACE_INFO));
  if (typeof window !== 'undefined' && window.__REFACTOR_LOG_STATE) parts.push('# refactor=' + JSON.stringify({ step: window.__REFACTOR_LOG_STATE.step || 'unknown', startedAt: window.__REFACTOR_LOG_STATE.startedAt || '', checkpoints: (window.__REFACTOR_LOG_STATE.checkpoints || []).length, compatMappings: (window.__REFACTOR_LOG_STATE.compatMappings || []).length, fallbacks: (window.__REFACTOR_LOG_STATE.fallbacks || []).length }));
  try {
    var selectedPrefab = (typeof currentProto === 'function' && currentProto()) ? currentProto().id : 'n/a';
    var mode = (typeof editor !== 'undefined' && editor && editor.mode) ? editor.mode : 'n/a';
    parts.push('# editorMode=' + mode);
    parts.push('# currentPrefab=' + selectedPrefab);
  } catch (err) {}
  try {
    if (typeof getShadowProbeSnapshot === 'function') parts.push('# shadowProbe=' + JSON.stringify(getShadowProbeSnapshot()));
  } catch (err) {}
  parts.push('');
  return parts.join('\n');
}

function logResolvedEntryInfo() {
  detailLog('entry-info: kind=' + String(APP_ENTRY_INFO.kind || 'unknown') + ' label=' + String(APP_ENTRY_INFO.label || 'unknown') + ' entry=' + String(APP_ENTRY_INFO.entryFile || 'unknown') + ' launcher=' + String(APP_ENTRY_INFO.launcherHint || 'unknown') + ' source=' + String(APP_ENTRY_INFO.source || 'unknown'));
  if (APP_ENTRY_INFO.build) detailLog('entry-info: build=' + APP_ENTRY_INFO.build);
  if (APP_ENTRY_INFO.href) detailLog('entry-info: href=' + APP_ENTRY_INFO.href);
}

function flushDebugLogUI(force) {
  force = !!force;
  var localUi = getLoggingUi();
  if (!localUi || !localUi.debugLog) return;
  var now = (typeof performance !== 'undefined' && typeof performance.now === 'function') ? performance.now() : Date.now();
  if (!force && lastLogUiFlushAt && (now - lastLogUiFlushAt) < LOG_UI_FLUSH_MS) return;
  localUi.debugLog.value = logs.slice(-LOG_UI_PREVIEW_LINES).join('\n');
  localUi.debugLog.scrollTop = localUi.debugLog.scrollHeight;
  lastLogUiFlushAt = now;
  logFlushScheduled = false;
}

function scheduleDebugLogUIFlush() {
  if (logFlushScheduled) return;
  logFlushScheduled = true;
  var cb = function () { flushDebugLogUI(true); };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(cb);
  else setTimeout(cb, LOG_UI_FLUSH_MS);
}

function pushLog(msg) {
  var line = '[' + String(++logSeq).padStart(5, '0') + '] [' + new Date().toLocaleTimeString('zh-CN', { hour12:false }) + '] ' + msg;
  logs.push(line);
  if (logs.length > MAX_LOG_LINES) logs.shift();
  scheduleDebugLogUIFlush();
}

function clearLogs() {
  logs.length = 0;
  logSeq = 0;
  logFlushScheduled = false;
  lastLogUiFlushAt = 0;
  var localUi = getLoggingUi();
  if (localUi && localUi.debugLog) localUi.debugLog.value = '';
}

function exportLogs() {
  pushLog('log-export:start lines=' + logs.length + ' entry=' + (APP_ENTRY_INFO.kind || 'unknown') + ':' + (APP_ENTRY_INFO.entryFile || 'unknown'));
  try {
    var ns = (typeof window !== 'undefined' && window.__APP_NAMESPACE) ? window.__APP_NAMESPACE : null;
    var fallbackStats = (ns && typeof ns.getFallbackStats === 'function')
      ? ns.getFallbackStats()
      : { total: 0, byBridge: {}, byOwner: {} };
    pushLog('[P2][SUMMARY] legacy-bridge-fallback-counts ' + JSON.stringify(fallbackStats));
  } catch (err) {
    try { pushLog('[P2][SUMMARY] legacy-bridge-fallback-counts ' + JSON.stringify({ total: 0, byBridge: {}, byOwner: {}, note: 'fallback-stats-unavailable', error: String(err && err.message || err || '') })); } catch (_) {}
  }
  if (typeof flushPerfSummary === 'function') flushPerfSummary(true);
  flushDebugLogUI(true);
  var payload = buildLogExportHeader() + logs.join('\n');
  var blob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'isometric-debug-log-' + Date.now() + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}



var renderDebugState = {
  frameSeq: 0,
  shadowPassSeq: 0,
  renderCallsThisFrame: 0,
  shadowPassesThisFrame: 0,
  lastFrame: -1,
  lastCameraSig: '',
  lastLightSig: '',
  lastBoxesSig: ''
};

function dbgNum(v, digits) {
  var d = typeof digits === 'number' ? digits : 3;
  var n = Number(v || 0);
  if (!isFinite(n)) n = 0;
  return Number(n.toFixed(d));
}

function dbgPoint3(p) {
  return { x: dbgNum(p && p.x, 4), y: dbgNum(p && p.y, 4), z: dbgNum(p && p.z, 4) };
}

function dbgBounds3(b) {
  if (!b) return null;
  return {
    minX: dbgNum(b.minX, 4), minY: dbgNum(b.minY, 4), minZ: dbgNum(b.minZ, 4),
    maxX: dbgNum(b.maxX, 4), maxY: dbgNum(b.maxY, 4), maxZ: dbgNum(b.maxZ, 4)
  };
}

function dbgSimpleHash(str) {
  str = String(str || '');
  var h = 2166136261 >>> 0;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function cameraSignatureForDebug() {
  var c = (typeof camera !== 'undefined' && camera) ? camera : { x: 0, y: 0 };
  var s = (typeof settings !== 'undefined' && settings) ? settings : {};
  return [dbgNum(c.x, 3), dbgNum(c.y, 3), dbgNum(s.worldDisplayScale, 3), dbgNum(s.tileScale, 3), dbgNum(typeof VIEW_W !== 'undefined' ? VIEW_W : 0, 1), dbgNum(typeof VIEW_H !== 'undefined' ? VIEW_H : 0, 1)].join('|');
}

function lightsSignatureForDebug() {
  var ls = (typeof lights !== 'undefined' && Array.isArray(lights)) ? lights : [];
  var parts = [];
  for (var i = 0; i < ls.length; i++) {
    var l = ls[i] || {};
    parts.push([
      l.id || l.name || i,
      l.type || 'light',
      dbgNum(l.x, 3), dbgNum(l.y, 3), dbgNum(l.z, 3),
      dbgNum(l.angle, 3), dbgNum(l.pitch, 3),
      dbgNum(l.intensity, 3), dbgNum(l.radius, 3), dbgNum(l.size, 3), dbgNum(l.softness, 3)
    ].join(','));
  }
  return dbgSimpleHash(parts.join('|'));
}

function boxesSignatureForDebug() {
  try {
    if (typeof boxesShadowSignature === 'function') return String(boxesShadowSignature());
  } catch (_) {}
  var bs = (typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes : [];
  var parts = [];
  for (var i = 0; i < bs.length; i++) {
    var b = bs[i] || {};
    parts.push([
      b.instanceId || b.id || i,
      dbgNum(b.x, 3), dbgNum(b.y, 3), dbgNum(b.z, 3),
      dbgNum(b.w, 3), dbgNum(b.d, 3), dbgNum(b.h, 3),
      b.base || ''
    ].join(','));
  }
  return dbgSimpleHash(parts.join('|'));
}

function summarizeLightForDebug(light, idx) {
  light = light || {};
  return {
    idx: idx,
    id: light.id || null,
    name: light.name || null,
    type: light.type || 'light',
    x: dbgNum(light.x, 4), y: dbgNum(light.y, 4), z: dbgNum(light.z, 4),
    angle: dbgNum(light.angle, 3), pitch: dbgNum(light.pitch, 3),
    intensity: dbgNum(light.intensity, 4), radius: dbgNum(light.radius, 3),
    size: dbgNum(light.size, 3), softness: dbgNum(light.softness, 3),
    color: light.color || null,
    enabled: light.enabled !== false
  };
}

function summarizeInstanceForDebug(inst, idx) {
  inst = inst || {};
  return {
    idx: idx,
    instanceId: inst.instanceId || null,
    prefabId: inst.prefabId || null,
    origin: dbgPoint3(inst.origin || { x: inst.x || 0, y: inst.y || 0, z: inst.z || 0 }),
    rotation: inst.rotation || 0,
    boxCount: Array.isArray(inst.boxes) ? inst.boxes.length : null,
    name: inst.name || null
  };
}

function summarizeBoxForDebug(box, idx) {
  box = box || {};
  return {
    idx: idx,
    instanceId: box.instanceId || null,
    x: dbgNum(box.x, 4), y: dbgNum(box.y, 4), z: dbgNum(box.z, 4),
    w: dbgNum(box.w || 1, 4), d: dbgNum(box.d || 1, 4), h: dbgNum(box.h || 1, 4),
    base: box.base || null
  };
}

function summarizePlayerForDebug() {
  if (typeof player === 'undefined' || !player) return null;
  return {
    x: dbgNum(player.x, 4), y: dbgNum(player.y, 4), z: dbgNum(player.z, 4),
    dir: player.dir || '',
    moving: !!player.moving,
    targetX: dbgNum(player.targetX, 4), targetY: dbgNum(player.targetY, 4)
  };
}

function buildSceneSnapshotForDebug(label, extra) {
  var frame = (typeof debugState !== 'undefined' && debugState && typeof debugState.frame === 'number') ? debugState.frame : -1;
  var c = (typeof camera !== 'undefined' && camera) ? camera : { x: 0, y: 0 };
  var s = (typeof settings !== 'undefined' && settings) ? settings : {};
  var ls = (typeof lights !== 'undefined' && Array.isArray(lights)) ? lights : [];
  var ins = (typeof instances !== 'undefined' && Array.isArray(instances)) ? instances : [];
  var bs = (typeof boxes !== 'undefined' && Array.isArray(boxes)) ? boxes : [];
  return {
    tag: label || 'scene-snapshot',
    entry: APP_ENTRY_INFO,
    frame: frame,
    wallClockMs: Date.now(),
    perfMs: (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') ? dbgNum(performance.now(), 3) : 0,
    renderFrameSeq: renderDebugState.frameSeq,
    shadowPassSeq: renderDebugState.shadowPassSeq,
    camera: { x: dbgNum(c.x, 4), y: dbgNum(c.y, 4), signature: cameraSignatureForDebug() },
    viewport: { w: typeof VIEW_W !== 'undefined' ? VIEW_W : 0, h: typeof VIEW_H !== 'undefined' ? VIEW_H : 0 },
    settings: {
      worldDisplayScale: dbgNum(s.worldDisplayScale, 4),
      tileScale: dbgNum(s.tileScale, 4),
      ambient: dbgNum(s.ambient, 4),
      gridW: s.gridW || 0,
      gridH: s.gridH || 0
    },
    player: summarizePlayerForDebug(),
    activeLightId: (typeof activeLightId !== 'undefined') ? activeLightId : null,
    lightState: (typeof lightState !== 'undefined' && lightState) ? {
      enabled: !!lightState.enabled,
      showShadows: !!lightState.showShadows,
      showGlow: !!lightState.showGlow,
      highContrastShadow: !!lightState.highContrastShadow,
      shadowAlpha: dbgNum(lightState.shadowAlpha, 4),
      shadowOpacityScale: dbgNum(lightState.shadowOpacityScale, 4),
      shadowDistanceFadeEnabled: !!lightState.shadowDistanceFadeEnabled,
      shadowDistanceFadeRate: dbgNum(lightState.shadowDistanceFadeRate, 4),
      shadowDistanceFadeMin: dbgNum(lightState.shadowDistanceFadeMin, 4),
      shadowEdgeFadeEnabled: !!lightState.shadowEdgeFadeEnabled,
      shadowEdgeFadePx: dbgNum(lightState.shadowEdgeFadePx, 4)
    } : null,
    signatures: {
      camera: cameraSignatureForDebug(),
      lights: lightsSignatureForDebug(),
      boxes: boxesSignatureForDebug()
    },
    lights: ls.map(summarizeLightForDebug),
    instances: ins.map(summarizeInstanceForDebug),
    boxes: bs.map(summarizeBoxForDebug),
    shadowProbe: (typeof getShadowProbeSnapshot === 'function') ? getShadowProbeSnapshot() : null,
    extra: extra || null
  };
}

function pushStructuredShadowLog(tag, payload, force) {
  if (!verboseLog) return;
  if (!shadowDebugDetailed && !force) return;
  var text = '';
  try { text = JSON.stringify(payload); }
  catch (err) { text = JSON.stringify({ error: 'stringify-failed', message: String(err && err.message || err) }); }
  pushLog('[shadowjson][' + String(tag || 'event') + '] ' + text);
}

function beginRenderFrameDebug(label, extra) {
  var frame = (typeof debugState !== 'undefined' && debugState && typeof debugState.frame === 'number') ? debugState.frame : -1;
  if (renderDebugState.lastFrame !== frame) {
    renderDebugState.lastFrame = frame;
    renderDebugState.renderCallsThisFrame = 0;
    renderDebugState.shadowPassesThisFrame = 0;
  }
  renderDebugState.frameSeq += 1;
  renderDebugState.renderCallsThisFrame += 1;
  pushStructuredShadowLog('frame-begin', buildSceneSnapshotForDebug(label || 'render-frame', {
    renderCallsThisFrame: renderDebugState.renderCallsThisFrame,
    shadowPassesThisFrame: renderDebugState.shadowPassesThisFrame,
    reason: extra || null
  }), true);
}

function beginShadowPassDebug(label, extra) {
  var frame = (typeof debugState !== 'undefined' && debugState && typeof debugState.frame === 'number') ? debugState.frame : -1;
  if (renderDebugState.lastFrame !== frame) {
    renderDebugState.lastFrame = frame;
    renderDebugState.renderCallsThisFrame = 0;
    renderDebugState.shadowPassesThisFrame = 0;
  }
  renderDebugState.shadowPassSeq += 1;
  renderDebugState.shadowPassesThisFrame += 1;
  var payload = buildSceneSnapshotForDebug(label || 'shadow-pass-begin', {
    renderCallsThisFrame: renderDebugState.renderCallsThisFrame,
    shadowPassesThisFrame: renderDebugState.shadowPassesThisFrame,
    reason: extra || null
  });
  if (renderDebugState.shadowPassesThisFrame > 1) {
    payload.warn = 'shadow-pass-reentered-same-frame';
  }
  pushStructuredShadowLog('shadow-pass-begin', payload, true);
}

function endShadowPassDebug(label, extra) {
  pushStructuredShadowLog('shadow-pass-end', buildSceneSnapshotForDebug(label || 'shadow-pass-end', extra || null), true);
}

function noteShadowOverlayCache(eventName, payload) {
  pushStructuredShadowLog('overlay-cache-' + String(eventName || 'event'), payload || {}, true);
}

function logReceiverCandidateDebug(payload) {
  pushStructuredShadowLog('receiver-candidate', payload || {}, true);
}

function logReceiverSummaryDebug(payload) {
  pushStructuredShadowLog('receiver-summary', payload || {}, true);
}

function logScreenOverlayDebug(payload) {
  pushStructuredShadowLog('screen-overlay', payload || {}, true);
}

function logStaticShadowEmitDebug(payload) {
  pushStructuredShadowLog('static-shadow-emit', payload || {}, true);
}

function initializeLoggingSystem() {
  if (logSystemReady) return true;
  logSystemReady = true;
  if (bootBuffer.length) {
    if (verboseLog) {
      for (var i = 0; i < bootBuffer.length; i++) pushLog(bootBuffer[i]);
    }
    bootBuffer.length = 0;
  }
  detailLog('log-system: ready');
  logResolvedEntryInfo();
  return true;
}
