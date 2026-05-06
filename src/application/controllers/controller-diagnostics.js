(function (global) {
  if (!global) return;

  var OWNER = 'src/application/controllers/controller-diagnostics.js';
  var PHASE = 'P11b-2-CONTROLLER-DIAGNOSTICS';

  function asObject(value) {
    return value && typeof value === 'object' ? value : {};
  }

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
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
    } catch (_) {}
    return line;
  }

  function perfNowMs() {
    try {
      if (typeof global.performance !== 'undefined' && global.performance && typeof global.performance.now === 'function') {
        return global.performance.now();
      }
    } catch (_) {}
    try {
      if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') return performance.now();
    } catch (_) {}
    return Date.now();
  }

  function isDetailedTerrainProfilingEnabled(deps) {
    var options = asObject(deps);
    var getter = options.getMainEditorTerrainSettings;
    if (typeof getter !== 'function') return false;
    try {
      var settings = getter('app-controllers:detailed-terrain-profiling');
      return !!(settings && settings.terrainDetailedProfilingEnabled === true);
    } catch (_) {
      return false;
    }
  }

  function recordTerrainDiagnostic(event, payload) {
    var entry = Object.assign({ event: String(event || '') }, safeClone(payload || {}));
    try { writeLogLine('[TERRAIN] ' + JSON.stringify(entry)); } catch (_) {}
    return entry;
  }

  function emitStructuredControllerLog(tag, payload) {
    var line = '[' + String(tag || 'APP-CONTROLLER') + '] ';
    try { line += JSON.stringify(payload || {}); } catch (_) { line += '{}'; }
    return writeLogLine(line);
  }

  function emitTerrainGenerateProfile(payload) {
    return emitStructuredControllerLog('TERRAIN-GENERATE-PROFILE', payload || {});
  }

  function emitSceneCommitProfile(payload) {
    return emitStructuredControllerLog('SCENE-COMMIT-PROFILE', payload || {});
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    safeClone: safeClone,
    writeLogLine: writeLogLine,
    isDetailedTerrainProfilingEnabled: isDetailedTerrainProfilingEnabled,
    recordTerrainDiagnostic: recordTerrainDiagnostic,
    controllerPerfNowMs: perfNowMs,
    emitStructuredControllerLog: emitStructuredControllerLog,
    emitTerrainGenerateProfile: emitTerrainGenerateProfile,
    emitSceneCommitProfile: emitSceneCommitProfile
  };

  global.__APP_CONTROLLER_DIAGNOSTICS__ = api;

  try {
    var ns = global.__APP_NAMESPACE || null;
    if (ns && typeof ns.bind === 'function') {
      ns.bind('controllers.diagnostics', api, { owner: OWNER, legacy: [], phase: PHASE });
      ns.bind('application.controllerDiagnostics', api, { owner: OWNER, legacy: [], phase: PHASE });
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
