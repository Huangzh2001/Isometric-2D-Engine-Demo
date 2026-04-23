// Step-10: application bootstrap assembly extracted from app.js
(function () {
  function appBootstrapLog(message, extra) {
    var line = '[app-bootstrap] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (err) { line += ' [extra-unserializable]'; }
    }
    if (typeof pushLog === 'function') pushLog(line);
    else if (typeof console !== 'undefined' && console.log) console.log(line);
    return line;
  }

  function getNamespacePath(path) {
    try {
      if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath(path);
      }
    } catch (_) {}
    return undefined;
  }

  function recordLegacyFallback(bridge, detail) {
    try {
      if (typeof window !== 'undefined' && window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.recordFallback === 'function') {
        window.__APP_NAMESPACE.recordFallback(bridge, 'src/presentation/shell/app-shell.js', detail);
      }
    } catch (_) {}
  }

  function getAppShellDependencies() {
    return {
      runtimeStateApi: getNamespacePath('state.runtimeState'),
      p0Logger: (typeof window !== 'undefined' && window.__P0_LOGGER) ? window.__P0_LOGGER : null,
      services: getNamespacePath('services') || {},
      state: getNamespacePath('state') || {},
      shell: getNamespacePath('shell') || {}
    };
  }

  function emitP2B(kind, message, extra) {
    var line = '[P2][' + String(kind || 'BOUNDARY') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
    return line;
  }

  function cleanupLog(message, extra) {
    if (typeof refactorLogCurrent === 'function') return refactorLogCurrent('Cleanup', message, extra);
    return appBootstrapLog(message, extra);
  }

  function emitP6(kind, message, extra) {
    var line = '[P6][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try { if (typeof pushLog === 'function') pushLog(line); else if (typeof console !== 'undefined' && console.log) console.log(line); } catch (_) {}
    return line;
  }

  function startupUiSummary() {
    return {
      hasCanvas: !!(typeof canvas !== 'undefined' && canvas),
      hasDebugLog: !!(typeof ui !== 'undefined' && ui && ui.debugLog),
      uiKeys: (typeof ui !== 'undefined' && ui) ? Object.keys(ui).length : 0,
      worldCols: (typeof settings !== 'undefined' && settings) ? settings.worldCols : null,
      worldRows: (typeof settings !== 'undefined' && settings) ? settings.worldRows : null,
      editorMode: (typeof editor !== 'undefined' && editor) ? editor.mode : null,
    };
  }

  function bindApplicationModules() {
    var result = {
      assetOwnership: false,
      placementOwnership: false,
      lightingUi: false,
      helperStatus: null,
    };
    if (typeof assertAssetManagementOwnership === 'function') {
      assertAssetManagementOwnership('app-startup');
      result.assetOwnership = true;
    }
    if (typeof assertPlacementOwnership === 'function') {
      assertPlacementOwnership('app-startup');
      result.placementOwnership = true;
    }
    if (typeof bindLightingUi === 'function') {
      result.lightingUi = !!bindLightingUi();
    }
    result.helperStatus = {
      currentProto: typeof currentProto,
      getPlayerProxyBox: typeof getPlayerProxyBox,
      updatePlayerMovement: typeof updatePlayerMovement,
      iso: typeof iso,
      screenToFloor: typeof screenToFloor,
      hexToRgb: typeof hexToRgb,
      rgbToCss: typeof rgbToCss,
      mixColor: typeof mixColor,
      mulColor: typeof mulColor,
      addColor: typeof addColor,
      normalize3: typeof normalize3,
      dot3: typeof dot3,
    };
    return result;
  }

  async function runStartupRestorePipeline() {
    appBootstrapLog('app-bootstrap:start-scene-restore');
    var deps = getAppShellDependencies();
    var workflow = deps.services && deps.services.sceneWorkflow;
    if (workflow && typeof workflow.runStartupRestore === 'function') {
      var workflowResult = await workflow.runStartupRestore({ source: 'app-shell:startup-restore', defaultSource: 'startup-default-file', localSource: 'startup-auto-restore', silent: true });
      if (workflowResult && workflowResult.ok) appBootstrapLog('app-bootstrap:scene-restore-restored', { target: workflowResult.target || 'workflow' });
      else appBootstrapLog('app-bootstrap:scene-restore-skipped', { target: 'workflow', reason: (workflowResult && workflowResult.error) ? workflowResult.error : 'not-restored' });
      return !!(workflowResult && workflowResult.ok);
    }
    appBootstrapLog('app-bootstrap:scene-restore-skipped', { target: 'workflow', reason: 'missing-scene-workflow-service' });
    return false;
  }

  function applyStartupUiDefaults(restoredScene) {
    if (!restoredScene) {
      applySettings();
      if (ui.playerProxyW) ui.playerProxyW.value = String(settings.playerProxyW);
      if (ui.playerProxyD) ui.playerProxyD.value = String(settings.playerProxyD);
      if (ui.playerHeightCells) ui.playerHeightCells.value = String(settings.playerHeightCells);
      updateModeButtons();
      appBootstrapLog('app-bootstrap:runtime-defaults-applied', { mode: editor.mode });
    } else {
      appBootstrapLog('app-bootstrap:runtime-defaults-skipped', { reason: 'scene-restored', mode: editor.mode });
    }

    ui.showLightShadows.checked = !!lightState.showShadows;
    ui.showLightGlow.checked = !!lightState.showGlow;
    if (ui.shadowHighContrast) ui.shadowHighContrast.checked = false;
    if (ui.shadowDebugColor) ui.shadowDebugColor.value = lightState.shadowDebugColor;
    if (ui.shadowAlpha) ui.shadowAlpha.value = String(lightState.shadowAlpha);
    if (ui.shadowAlphaValue) ui.shadowAlphaValue.textContent = lightState.shadowAlpha.toFixed(2);
    if (ui.shadowOpacity) ui.shadowOpacity.value = String(lightState.shadowOpacityScale);
    if (ui.shadowOpacityValue) ui.shadowOpacityValue.textContent = lightState.shadowOpacityScale.toFixed(2) + '×';
    if (ui.shadowDistanceFadeEnabled) ui.shadowDistanceFadeEnabled.checked = !!lightState.shadowDistanceFadeEnabled;
    if (ui.shadowDistanceFadeRate) ui.shadowDistanceFadeRate.value = String(lightState.shadowDistanceFadeRate);
    if (ui.shadowDistanceFadeRateValue) ui.shadowDistanceFadeRateValue.textContent = Number(lightState.shadowDistanceFadeRate || 0).toFixed(2);
    if (ui.shadowDistanceFadeMin) ui.shadowDistanceFadeMin.value = String(lightState.shadowDistanceFadeMin);
    if (ui.shadowDistanceFadeMinValue) ui.shadowDistanceFadeMinValue.textContent = Number(lightState.shadowDistanceFadeMin || 0).toFixed(2);
    if (ui.shadowEdgeFadeEnabled) ui.shadowEdgeFadeEnabled.checked = !!lightState.shadowEdgeFadeEnabled;
    if (ui.shadowEdgeFadePx) ui.shadowEdgeFadePx.value = String(lightState.shadowEdgeFadePx);
    if (ui.shadowEdgeFadePxValue) ui.shadowEdgeFadePxValue.textContent = Number(lightState.shadowEdgeFadePx || 0).toFixed(1) + ' px';
    syncLightUI();
    updateSceneFileStatus();
  }

  function runStartupAssetPipeline() {
    appBootstrapLog('app-bootstrap:start-asset-scan');
    var deps = getAppShellDependencies();
    var workflow = deps.services && deps.services.assetWorkflow;
    if (workflow && typeof workflow.runAssetScan === 'function') {
      try {
        Promise.resolve(workflow.runAssetScan({ force: true, source: 'app-shell:startup-asset-scan' }))
          .then(function () {})
          .catch(function (err) {
            appBootstrapLog('app-bootstrap:asset-scan-skipped', { reason: err && err.message ? err.message : String(err) });
          });
        appBootstrapLog('app-bootstrap:asset-scan-requested', { force: true, via: 'services.assetWorkflow' });
      } catch (err) {
        appBootstrapLog('app-bootstrap:asset-scan-skipped', { reason: err && err.message ? err.message : String(err) });
      }
      return;
    }
    appBootstrapLog('app-bootstrap:asset-scan-skipped', { reason: 'missing-asset-workflow-service' });
  }

  async function bootstrapApplication() {
    cleanupLog('cleanup-verify:start', { owner: 'src/presentation/shell/app-shell.js', entry: 'bootstrapApplication' });
    appBootstrapLog('app-bootstrap:start');
    appBootstrapLog('app-bootstrap:dom-ready', startupUiSummary());
    var deps = getAppShellDependencies();
    appBootstrapLog('app-bootstrap:runtime-ready', (deps.runtimeStateApi && deps.runtimeStateApi.summarize) ? deps.runtimeStateApi.summarize() : startupUiSummary());
    emitP2B('BOUNDARY', 'explicit-deps-bound', { phase: 'P2-B', owner: 'src/presentation/shell/app-shell.js', runtimeState: !!deps.runtimeStateApi, serviceKeys: Object.keys(deps.services || {}), shellKeys: Object.keys(deps.shell || {}) });
    var moduleBinding = bindApplicationModules();
    appBootstrapLog('app-bootstrap:modules-bound', moduleBinding);
    var depsForLogging = getAppShellDependencies();
    if (depsForLogging.p0Logger && typeof depsForLogging.p0Logger.markModule === 'function') depsForLogging.p0Logger.markModule('src/presentation/shell/app-shell.js:bootstrapApplication', { restoredScene: null, moduleBinding: moduleBinding });
    if (depsForLogging.p0Logger && typeof depsForLogging.p0Logger.logBoundarySummary === 'function') depsForLogging.p0Logger.logBoundarySummary('app-shell:modules-bound');
    loadCustomPrefabsFromLocalStorage();
    refreshPrefabSelectOptions('app-shell:startup-prefab-refresh');
    var assetWorkflow = deps.services && deps.services.assetWorkflow;
    var sceneWorkflow = deps.services && deps.services.sceneWorkflow;
    emitP6('SUMMARY', 'service-workflow-coverage', {
      phase: 'P6-C',
      owner: 'src/presentation/shell/app-shell.js',
      assetWorkflow: !!assetWorkflow,
      sceneWorkflow: !!sceneWorkflow,
      wiredInto: ['bootstrapApplication:habbo-root-ready', 'runStartupRestorePipeline', 'runStartupAssetPipeline', 'ui.js buttons', 'ui/ui-habbo-library.js interactions', 'app.js editor-return scan hooks'],
      notes: ['P6-C keeps workflow-first orchestration in app-shell, UI, and editor-return hooks, and now expects legacy scene/asset wrappers to delegate into services.assetWorkflow and services.sceneWorkflow before using local compatibility fallbacks.']
    });
    if (assetWorkflow && typeof assetWorkflow.ensureHabboRootReady === 'function') {
      try {
        var rootResult = await assetWorkflow.ensureHabboRootReady({ silent: true, source: 'app-shell:ensure-habbo-root-ready' });
        if (rootResult && rootResult.ok) appBootstrapLog('app-bootstrap:habbo-root-ready');
        else appBootstrapLog('app-bootstrap:habbo-root-skipped', { reason: rootResult && rootResult.error ? rootResult.error : 'not-ready' });
      } catch (err) {
        appBootstrapLog('app-bootstrap:habbo-root-skipped', { reason: err && err.message ? err.message : String(err) });
      }
    } else if (typeof fetchHabboAssetRootConfig === 'function') {
      try {
        await fetchHabboAssetRootConfig({ silent: true });
        appBootstrapLog('app-bootstrap:habbo-root-ready');
      } catch (err) {
        appBootstrapLog('app-bootstrap:habbo-root-skipped', { reason: err && err.message ? err.message : String(err) });
      }
    } else {
      appBootstrapLog('app-bootstrap:habbo-root-skipped', { reason: 'no-config-api' });
    }

    var restoredScene = await runStartupRestorePipeline();
    applyStartupUiDefaults(restoredScene);
    runStartupAssetPipeline();
    var depsForDiagnostics = getAppShellDependencies();
    requestAnimationFrame(loop);
    appBootstrapLog('app-bootstrap:first-frame-ready', { scheduled: true, diagnosticsDeferred: !!(depsForDiagnostics.p0Logger && typeof depsForDiagnostics.p0Logger.runServiceDiagnostics === 'function') });
    if (depsForDiagnostics.p0Logger && typeof depsForDiagnostics.p0Logger.logInvariantSummary === 'function') depsForDiagnostics.p0Logger.logInvariantSummary('app-shell:post-bootstrap');
    if (depsForDiagnostics.p0Logger && typeof depsForDiagnostics.p0Logger.runServiceDiagnostics === 'function') {
      try {
        setTimeout(function () {
          try {
            appBootstrapLog('app-bootstrap:p0-diagnostics-deferred', { context: 'bootstrapApplication' });
            Promise.resolve(depsForDiagnostics.p0Logger.runServiceDiagnostics({ context: 'bootstrapApplication', deferred: true }))
              .catch(function (err) {
                appBootstrapLog('app-bootstrap:p0-diagnostics-skipped', { reason: err && err.message ? err.message : String(err) });
              });
          } catch (err) {
            appBootstrapLog('app-bootstrap:p0-diagnostics-skipped', { reason: err && err.message ? err.message : String(err) });
          }
        }, 0);
      } catch (err) {
        appBootstrapLog('app-bootstrap:p0-diagnostics-skipped', { reason: err && err.message ? err.message : String(err) });
      }
    }
    appBootstrapLog('app-bootstrap:done', { restoredScene: !!restoredScene, editorMode: editor.mode, prototypeIndex: editor.prototypeIndex, diagnosticsDeferred: true });
    cleanupLog('cleanup-verify:done', { owner: 'src/presentation/shell/app-shell.js', restoredScene: !!restoredScene, appShellApi: true, directWindowEntry: false });
    return { restoredScene: !!restoredScene };
  }

  async function initializeMainApp() {
    try {
      return await bootstrapApplication();
    } catch (err) {
      var detail = formatErrorDetails(err && err.message ? err.message : 'boot finalization failed', 'boot-finalize', 0, 0, err);
      detailLog('[boot-finalize-error] ' + detail);
      errorBanner('启动阶段错误：\n' + detail);
      throw err;
    }
  }

  var appShellApi = {
    owner: 'src/presentation/shell/app-shell.js',
    initializeMainApp: initializeMainApp,
    bootstrapApplication: bootstrapApplication,
    bindApplicationModules: bindApplicationModules,
    runStartupRestorePipeline: runStartupRestorePipeline,
    runStartupAssetPipeline: runStartupAssetPipeline,
  };
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('shell.appShell', appShellApi, { owner: 'src/presentation/shell/app-shell.js', legacy: [], phase: 'P2-C' });
  }

  if (typeof markRefactorCheckpoint === 'function') {
    markRefactorCheckpoint('AppShell', 'app-shell-ready', {
      owner: appShellApi.owner,
      hasInitializeMainApp: typeof initializeMainApp === 'function',
      hasBootstrapApplication: typeof bootstrapApplication === 'function',
      hasBindApplicationModules: typeof bindApplicationModules === 'function',
      hasRunStartupRestorePipeline: typeof runStartupRestorePipeline === 'function',
      hasRunStartupAssetPipeline: typeof runStartupAssetPipeline === 'function',
    });
  }
  if (typeof logCompatMapping === 'function') {
    logCompatMapping('initializeMainApp', 'src/presentation/shell/app-shell.js');
  }
})();
