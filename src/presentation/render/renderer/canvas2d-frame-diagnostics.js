(function (global) {
  if (!global) return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-frame-diagnostics.js';
  var PHASE = 'P11c-1-CANVAS2D-FRAME-DIAGNOSTICS';

  function getNamespacePath(path) {
    try {
      if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.getPath === 'function') {
        return global.__APP_NAMESPACE.getPath(path);
      }
    } catch (_) {}
    return undefined;
  }

  function getLogger() {
    try {
      if (typeof global.pushLog === 'function') return global.pushLog;
    } catch (_) {}
    try {
      if (typeof pushLog === 'function') return pushLog;
    } catch (_) {}
    return null;
  }

  function writeLogLine(line) {
    try {
      var logger = getLogger();
      if (typeof logger === 'function') {
        logger(line);
        return line;
      }
      if (typeof console !== 'undefined' && console && console.log) console.log(line);
    } catch (_) {
      try { if (typeof console !== 'undefined' && console && console.log) console.log(line); } catch (__) {}
    }
    return line;
  }

  function emitP5(kind, message, extra) {
    var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    return writeLogLine(line);
  }

  function emitRendererProfile(tag, payload) {
    var line = '[' + String(tag || 'RENDERER-PROFILE') + '] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    return writeLogLine(line);
  }

  function safeFixed(value) {
    var n = Number(value || 0);
    return Number(n.toFixed ? n.toFixed(3) : n);
  }

  function beginFunctionBreakdownFrame() {
    try {
      global.__RENDER_FUNCTION_BREAKDOWN__ = { timings: {}, counts: {}, extras: {} };
    } catch (_) {}
  }

  function getFunctionBreakdownFrame() {
    try { return global.__RENDER_FUNCTION_BREAKDOWN__ || null; } catch (_) { return null; }
  }

  function getLastBaseWorldPassesBreakdown() {
    try { return global.__LAST_BASEWORLD_PASSES_BREAKDOWN__ || null; } catch (_) { return null; }
  }

  function cloneSimpleObject(obj) {
    var out = {};
    if (!obj || typeof obj !== 'object') return out;
    Object.keys(obj).forEach(function (key) {
      var value = obj[key];
      if (value == null || typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') out[key] = value;
    });
    return out;
  }

  function isDetailedRendererProfilingEnabled() {
    try {
      if (global.__DETAILED_RENDER_PROFILE__ === true) return true;
      if (typeof global.localStorage !== 'undefined' && global.localStorage) {
        var value = global.localStorage.getItem('detailedRenderProfile') || global.localStorage.getItem('rendererProfileVerbose');
        return value === '1' || value === 'true';
      }
    } catch (_) {}
    return false;
  }

  function perfNowMs() {
    try {
      if (global.performance && typeof global.performance.now === 'function') return global.performance.now();
    } catch (_) {}
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function shouldEmitProfile(adapterApi, signatureKey, signature, minGapMs, options) {
    var api = adapterApi && typeof adapterApi === 'object' ? adapterApi : {};
    var opts = options && typeof options === 'object' ? options : {};
    var detailed = isDetailedRendererProfilingEnabled();
    minGapMs = detailed ? Number(minGapMs || 0) : Math.max(1000, Number(minGapMs || 0));
    api.__profileState = api.__profileState || {};
    var bucket = api.__profileState[signatureKey] || { at: 0, sig: '' };
    var now = perfNowMs();
    var slow = opts.slow === true;
    var effectiveGap = slow ? Math.min(minGapMs, 350) : minGapMs;
    if ((now - Number(bucket.at || 0)) < effectiveGap) return false;
    if (!slow && bucket.sig === signature && (now - Number(bucket.at || 0)) < Math.max(effectiveGap, 3000)) return false;
    api.__profileState[signatureKey] = { at: now, sig: signature };
    return true;
  }

  function recordDrawDiagnostic(kind, payload) {
    try {
      var api = getNamespacePath('infrastructure.itemRotationDiagnostic') || global.__ITEM_ROTATION_DIAGNOSTIC__ || null;
      if (api && typeof api.record === 'function') api.record(kind, payload || null);
    } catch (_) {}
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    emitP5: emitP5,
    emitRendererProfile: emitRendererProfile,
    safeFixed: safeFixed,
    beginFunctionBreakdownFrame: beginFunctionBreakdownFrame,
    getFunctionBreakdownFrame: getFunctionBreakdownFrame,
    getLastBaseWorldPassesBreakdown: getLastBaseWorldPassesBreakdown,
    cloneSimpleObject: cloneSimpleObject,
    isDetailedRendererProfilingEnabled: isDetailedRendererProfilingEnabled,
    shouldEmitProfile: shouldEmitProfile,
    recordDrawDiagnostic: recordDrawDiagnostic
  };

  global.__CANVAS2D_FRAME_DIAGNOSTICS__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('renderer.canvas2dFrameDiagnostics', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('renderer.diagnostics.canvas2dFrame', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
