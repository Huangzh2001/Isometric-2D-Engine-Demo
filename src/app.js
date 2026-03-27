// v1 split file generated from original monolithic app.js
// 注意：此文件为保持行为稳定的第一刀拆分，允许存在少量跨层函数。

// function-call trace installer: logs file + function name so main/editor or wrong-path issues are obvious.
var __functionTraceSeq = 0;
function summarizeTraceArg(value) {
  if (value == null) return String(value);
  if (typeof value === 'string') return value.length > 48 ? JSON.stringify(value.slice(0, 48) + '…') : JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return 'array(len=' + value.length + ')';
  if (typeof value === 'function') return 'fn';
  if (typeof value === 'object') {
    try {
      if (value.id) return 'obj(id=' + value.id + ')';
      if (value.prefabId) return 'obj(prefabId=' + value.prefabId + ')';
      if (value.instanceId) return 'obj(instanceId=' + value.instanceId + ')';
      var keys = Object.keys(value).slice(0, 4);
      return 'obj{' + keys.join(',') + (Object.keys(value).length > 4 ? ',…' : '') + '}';
    } catch (err) {
      return 'obj';
    }
  }
  return typeof value;
}
function traceFunctionCall(file, name, argsLike) {
  try {
    var args = [];
    for (var i = 0; i < Math.min((argsLike && argsLike.length) || 0, 3); i++) args.push(summarizeTraceArg(argsLike[i]));
    detailLog('[fn-enter#' + String(++__functionTraceSeq).padStart(5, '0') + '] ' + file + '::' + name + '(' + args.join(', ') + ')');
  } catch (err) {
    detailLog('[fn-enter#' + String(++__functionTraceSeq).padStart(5, '0') + '] ' + file + '::' + name + '(trace-error)');
  }
}
function installFunctionTrace(file, names) {
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var original = window[name];
    if (typeof original !== 'function' || original.__isFunctionTraceWrapped) continue;
    (function (fnName, fnOriginal) {
      function wrapped() {
        traceFunctionCall(file, fnName, arguments);
        return fnOriginal.apply(this, arguments);
      }
      wrapped.__isFunctionTraceWrapped = true;
      wrapped.__originalFunction = fnOriginal;
      window[fnName] = wrapped;
      try { eval(fnName + ' = window[\"' + fnName + '\"]'); } catch (err) {}
    })(name, original);
  }
}
var __traceSearch = (typeof location !== 'undefined' && location.search) ? String(location.search) : '';
var __fullFunctionTraceEnabled = /(?:[?&](?:fntrace|trace)=1)|(?:[?&]trace=all)/i.test(__traceSearch);
var __coreFunctionTraceOnly = !__fullFunctionTraceEnabled;

var __functionTraceSpec = {
  'src/state.js': [
    'applySceneSnapshot','saveSceneToLocalStorage','loadSceneFromLocalStorage','updateModeButtons','setEditorMode',
    'importPrefabDefinition','normalizePrefab','prepareImportedPrefabForPlacement',
    'parseHabboVisualizationGraphics','chooseHabboVisualization','getHabboVisualizationState','getHabboLayerLetter','getHabboAnimationFrameForLayer','chooseHabboAssetForLayer',
    'parseHabboSwfMetadataFromXmls','buildHabboLayerDirectionsFromBitmaps','buildHabboSpriteDirectionsFromBitmaps','buildHabboFloorAnchor',
    'parseHabboSwfRuntime','buildHabboPrefabDefinition','importHabboSwfToSceneFromBuffer','importHabboSwfFileToScene','importBundledHabboDemoToScene',
    'isLegacyFlatHabboPrefab','queueLegacyHabboPrefabRepair','runLegacyHabboRepairQueue','scanAssetPrefabs'
  ],
  'src/placement/placement.js': [
    'makeInstance','expandInstanceToBoxes','rebuildBoxesFromInstances','removeInstanceById','findInstanceById','findInstanceForBox',
    'startDragging','commitPreview','cancelDrag','placeCurrentPrefab','movePlacedInstance','refreshPlacementOrdering','legacyBoxesToInstances'
  ],
  'src/player/player.js': [
    'resetPlayer','clampPlayerToWorld','getPlayerProxyBox','getPlayerShadowCenter','getPlayerGroundBounds','getPlayerInput','collidesPlayer','canPlayerMoveTo','applyPlayerInput','updatePlayerMovement'
  ],
  'src/lighting/lighting.js': [
    'normalizeLight','applyLightingPreset','activeLight','syncLightUI','renderLightList','addLight','deleteActiveLight','hitLightAxis','startLightAxisDrag','updateLightAxisDrag','renderLightingShadows','renderLightingGlow','drawLightingBulb','drawLightingAxes'
  ],
  'src/ui.js': [
    'setActivePanelTab','refreshItemInspector','refreshPlayerInspector','refreshWorldInspector','refreshInspectorPanels','applyWorldDisplayScale','applySettings'
  ],
  'src/logic.js': [
    'currentProto','screenToFloor','projectGroundPoint','buildShadowComponents','drawProjectedShadow','drawPlayerShadow'
  ],
  'src/render.js': [
    'prefabDrawsVoxels','prefabHasSprite','getPrefabSpriteConfig','getHabboLayerConfigList','getCachedImageFromDataUrl','getPrefabSpriteImage','rotKeyForSprite',
    'drawPrefabSpriteAt','drawPrefabSpriteInstance','drawHabboDebugOverlay','getInstanceProxyBounds','classifyPlayerAgainstProxyBox','computeSpriteRenderableSort',
    'rebuildStaticBoxRenderCacheIfNeeded','mergeSortedRenderables','drawFloor','drawPlayerSlice','updatePreview','pickBoxAtScreen','update','render'
  ],
  'src/app.js': ['loop']
};
window.__FUNCTION_TRACE_INFO = { enabled: __fullFunctionTraceEnabled, mode: (__fullFunctionTraceEnabled ? 'all' : 'targeted-only'), files: Object.keys(__functionTraceSpec) };

function loop(now) {
  debugState.frame += 1;
  const dt = Math.min(0.033, loop.last ? (now - loop.last) / 1000 : 0.016);
  loop.last = now;
  if (typeof document !== 'undefined' && document.hidden) {
    requestAnimationFrame(loop);
    return;
  }
  const loopStartMs = perfNow();
  let updateStartMs = loopStartMs;
  let renderStartMs = loopStartMs;
  let updateEndMs = loopStartMs;
  let renderEndMs = loopStartMs;
  try {
    if (debugState.frame <= 5 || verboseLog) detailLog(`loop:start frame=${debugState.frame} now=${now.toFixed(2)} dt=${dt.toFixed(4)}`);
    updateStartMs = perfNow();
    update(dt);
    updateEndMs = perfNow();
    renderStartMs = perfNow();
    render();
    renderEndMs = perfNow();
    recordPerfSample(renderEndMs - loopStartMs, updateEndMs - updateStartMs, renderEndMs - renderStartMs);
    flushPerfSummary(false);
    if (debugState.frame <= 5 || verboseLog) detailLog(`loop:done frame=${debugState.frame}`);
  } catch (err) {
    const detail = formatErrorDetails(err?.message || 'loop failed', 'loop', 0, 0, err);
    detailLog(`[loop-error] ${detail}`);
    errorBanner(`主循环错误：
${detail}`);
    throw err;
  }
  requestAnimationFrame(loop);
}
if (__fullFunctionTraceEnabled) {
  Object.keys(__functionTraceSpec).forEach(function (file) { installFunctionTrace(file, __functionTraceSpec[file]); });
  detailLog('function-trace: installed ' + JSON.stringify(__functionTraceSpec));
} else {
  detailLog('function-trace: disabled full wrapping; mode=targeted-only search=' + JSON.stringify(__traceSearch));
}


safeListen(canvas, 'mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - rect.left) * (VIEW_W / rect.width);
  mouse.y = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.inside = true;

  if (lightState.dragAxis) {
    updateLightAxisDrag();
  } else {
    lightState.hoverAxis = hitLightAxis(mouse.x, mouse.y);
  }

  if (mouse.draggingView && editor.mode === 'view' && !lightState.dragAxis) {
    const dx = mouse.x - mouse.panStartX;
    const dy = mouse.y - mouse.panStartY;
    camera.x = mouse.cameraStartX + dx;
    camera.y = mouse.cameraStartY + dy;
  }
}, 'canvas:mousemove');
safeListen(canvas, 'mouseleave', () => { mouse.inside = false; mouse.draggingView = false; editor.preview = null; lightState.hoverAxis = null; }, 'canvas:mouseleave');
safeListen(canvas, 'wheel', (e) => {
  var rect = canvas.getBoundingClientRect();
  var sx = (e.clientX - rect.left) * (VIEW_W / rect.width);
  var sy = (e.clientY - rect.top) * (VIEW_H / rect.height);
  mouse.x = sx;
  mouse.y = sy;
  mouse.inside = true;
  var anchorWorld = screenToFloor(sx, sy);
  var factor = e.deltaY < 0 ? 1.1 : 0.9;
  if (applyWorldDisplayScale(settings.worldDisplayScale * factor, anchorWorld, { x: sx, y: sy })) {
    e.preventDefault();
  }
}, 'canvas:wheel');
safeListen(canvas, 'mousedown', (e) => {
  if (e.button === 0 && typeof shadowProbeState !== 'undefined' && shadowProbeState && shadowProbeState.markMode) {
    const face = (typeof pickFaceAtScreen === 'function') ? pickFaceAtScreen(mouse.x, mouse.y, xrayFaces) : null;
    if (face && typeof setShadowProbeMarkerFromFace === 'function') {
      setShadowProbeMarkerFromFace(face, mouse.x, mouse.y, 'manual-mark');
    } else {
      if (typeof pushLog === 'function') pushLog('[shadow-probe] mark miss at (' + mouse.x.toFixed(1) + ',' + mouse.y.toFixed(1) + ')');
    }
    e.preventDefault();
    return;
  }
  const axis = hitLightAxis(mouse.x, mouse.y);
  if (e.button === 0 && axis) {
    startLightAxisDrag(axis);
    return;
  }

  if (e.button === 2) {
    pushLog('mouse: right-click cancel');
    cancelDrag();
    e.preventDefault();
    return;
  }

  if (editor.mode === 'view') {
    mouse.draggingView = true;
    mouse.panStartX = mouse.x;
    mouse.panStartY = mouse.y;
    mouse.cameraStartX = camera.x;
    mouse.cameraStartY = camera.y;
    mouse.viewDownX = mouse.x;
    mouse.viewDownY = mouse.y;
    pushLog(`mouse: start-pan at (${mouse.x.toFixed(1)},${mouse.y.toFixed(1)}) camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
    return;
  }

  if (editor.mode === 'delete') {
    const picked = pickBoxAtScreen(mouse.x, mouse.y);
    if (picked) {
      var targetInstance = findInstanceForBox(picked);
      if (targetInstance) {
        removeInstanceById(targetInstance.instanceId);
        pushLog(`delete: removed instance ${targetInstance.instanceId}:${getPrefabById(targetInstance.prefabId).name}`);
      } else {
        boxes = boxes.filter(b => b.id !== picked.id);
        pushLog(`delete: removed ${describeBox(picked)}`);
      }
      invalidateShadowGeometryCache('delete');
    } else {
      pushLog('delete: none');
    }
    updatePreview();
    return;
  }

  pushLog(`mouse: left-click mode=${editor.mode} shift=${e.shiftKey} preview=${editor.preview ? JSON.stringify({valid:editor.preview.valid, reason:editor.preview.reason, prefabId:editor.preview.prefabId || null, origin:editor.preview.origin || null, box:editor.preview.box || null, boxesCount:editor.preview.boxes ? editor.preview.boxes.length : 0, overlapIds:editor.preview.overlapIds || []}) : 'null'}`);

  if (editor.mode === 'drag') {
    pushLog('mouse: drag mode -> commitPreview');
    commitPreview();
    return;
  }

  if (!e.shiftKey) {
    pushLog('mouse: normal left -> commitPreview');
    commitPreview();
    return;
  }

  const picked = pickBoxAtScreen(mouse.x, mouse.y);
  if (picked) {
    pushLog(`mouse: shift-pick ${describeBox(picked)}`);
    startDragging(picked);
  } else {
    pushLog('mouse: shift-pick none');
  }
}, 'canvas:mousedown');
safeListen(window, 'mouseup', () => {
  if (mouse.draggingView) {
    pushLog(`mouse: end-pan camera=(${camera.x.toFixed(1)},${camera.y.toFixed(1)})`);
    if (editor.mode === 'view' && !lightState.dragAxis) {
      var dx = mouse.x - (mouse.viewDownX || mouse.panStartX || mouse.x);
      var dy = mouse.y - (mouse.viewDownY || mouse.panStartY || mouse.y);
      if (Math.hypot(dx, dy) < 6) {
        var picked = pickBoxAtScreen(mouse.x, mouse.y);
        var targetInst = picked ? findInstanceForBox(picked) : null;
        if (targetInst) {
          setSelectedInstance(targetInst.instanceId);
          setActivePanelTab('items');
          refreshInspectorPanels();
          pushLog(`inspect: selected ${targetInst.instanceId}:${getPrefabById(targetInst.prefabId).name}`);
        } else {
          clearSelectedInstance();
          refreshInspectorPanels();
          pushLog('inspect: cleared selection');
        }
      }
    }
  }
  mouse.draggingView = false;
  lightState.dragAxis = null;
  lightState.dragStartMouse = null;
  lightState.dragStartLight = null;
}, 'window:mouseup');
safeListen(canvas, 'contextmenu', (e) => e.preventDefault(), 'canvas:contextmenu');

safeListen(window, 'keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'g' && !e.repeat) { showDebug = !showDebug; ui.showDebugBox.checked = showDebug; }
  else if (k === 't' && !e.repeat) { xrayFaces = !xrayFaces; ui.xrayFaces.checked = xrayFaces; }
  else if (k === 'l' && !e.repeat) { showFrontLines = !showFrontLines; ui.showFrontLines.checked = showFrontLines; }
  else if (k === 'm' && !e.repeat) { if (typeof setShadowProbeMarkMode === 'function') setShadowProbeMarkMode(!(shadowProbeState && shadowProbeState.markMode), 'key-m'); }
  else if (k === 'n' && !e.repeat) { if (typeof clearShadowProbeMarker === 'function') clearShadowProbeMarker('key-n'); }
  else if (k === 'p' && !e.repeat) { if (typeof captureShadowProbeFrame === 'function') captureShadowProbeFrame('key-p'); }
  else if (k === 'u' && !e.repeat) { lightState.showAxes = !lightState.showAxes; }
  else if (k === 'r' && !e.repeat) resetPlayer();
  else if (k === 'v' && !e.repeat) setEditorMode('view');
  else if (k === 'b' && !e.repeat) setEditorMode('place');
  else if (k === 'x' && !e.repeat) setEditorMode('delete');
  else if (k === 'q' && !e.repeat) { editor.rotation = (editor.rotation + 1) % 2; pushLog(`key: rotate -> ${editor.rotation}`); updatePreview(); }
  else if (/^[1-7]$/.test(k) && !e.repeat) { editor.prototypeIndex = clamp(Number(k) - 1, 0, Math.min(PREFAB_KEY_LIMIT, prototypes.length) - 1); if (ui.prefabSelect) ui.prefabSelect.value = String(editor.prototypeIndex); editor.mode = 'place'; pushLog(`key: prefab -> ${currentProto().name}`); updatePreview(); }
  keys.add(k);
  if (k.startsWith('arrow')) e.preventDefault();
}, 'window:keydown');
safeListen(window, 'keyup', (e) => keys.delete(e.key.toLowerCase()), 'window:keyup');

detailLog('boot-seq: begin final initialization');
(async function initializeMainApp() {
try {
  if (typeof assertAssetManagementOwnership === 'function') {
    assertAssetManagementOwnership('app-startup');
    detailLog('boot-seq: asset-management ownership ok');
  }
  if (typeof assertPlacementOwnership === 'function') {
    assertPlacementOwnership('app-startup');
    detailLog('boot-seq: placement ownership ok');
  }
  if (typeof bindLightingUi === 'function') {
    var lightingBound = bindLightingUi();
    detailLog('boot-seq: bindLightingUi ' + (lightingBound ? 'ok' : 'deferred'));
  }
  const helperStatus = {
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
  detailLog(`boot-seq: helper-check ${JSON.stringify(helperStatus)}`);
  loadCustomPrefabsFromLocalStorage();
  refreshPrefabSelectOptions();
  if (typeof fetchHabboAssetRootConfig === 'function') {
    try { await fetchHabboAssetRootConfig({ silent: true }); detailLog('boot-seq: habbo root config fetched'); } catch (err) { detailLog(`boot-seq: habbo root config skipped ${err?.message || err}`); }
  }
  detailLog('boot-seq: habbo library prefetch disabled');
  let restoredScene = false;
  try {
    restoredScene = await loadDefaultSceneFromServer({ source: 'startup-default-file', silent: true });
    if (restoredScene) detailLog('boot-seq: auto-restored default scene file');
  } catch (err) {
    detailLog(`boot-seq: default-file-restore skipped ${err?.message || err}`);
  }
  if (!restoredScene) {
    restoredScene = await loadSceneFromLocalStorage({ source: 'startup-auto-restore', silent: true });
  }
  if (!restoredScene) {
    applySettings();
    if (ui.playerProxyW) ui.playerProxyW.value = String(settings.playerProxyW);
    if (ui.playerProxyD) ui.playerProxyD.value = String(settings.playerProxyD);
    if (ui.playerHeightCells) ui.playerHeightCells.value = String(settings.playerHeightCells);
    detailLog('boot-seq: applySettings ok');
    updateModeButtons();
    detailLog(`boot-seq: updateModeButtons ok mode=${editor.mode}`);
  } else {
    detailLog('boot-seq: auto-restored saved scene');
  }
  ui.showLightShadows.checked = !!lightState.showShadows;
  ui.showLightGlow.checked = !!lightState.showGlow;
  if (ui.shadowHighContrast) ui.shadowHighContrast.checked = false;
  if (ui.shadowDebugColor) ui.shadowDebugColor.value = lightState.shadowDebugColor;
  if (ui.shadowAlpha) ui.shadowAlpha.value = String(lightState.shadowAlpha);
  if (ui.shadowAlphaValue) ui.shadowAlphaValue.textContent = lightState.shadowAlpha.toFixed(2);
  if (ui.shadowOpacity) ui.shadowOpacity.value = String(lightState.shadowOpacityScale);
  if (ui.shadowOpacityValue) ui.shadowOpacityValue.textContent = `${lightState.shadowOpacityScale.toFixed(2)}×`;
  if (ui.shadowDistanceFadeEnabled) ui.shadowDistanceFadeEnabled.checked = !!lightState.shadowDistanceFadeEnabled;
  if (ui.shadowDistanceFadeRate) ui.shadowDistanceFadeRate.value = String(lightState.shadowDistanceFadeRate);
  if (ui.shadowDistanceFadeRateValue) ui.shadowDistanceFadeRateValue.textContent = Number(lightState.shadowDistanceFadeRate || 0).toFixed(2);
  if (ui.shadowDistanceFadeMin) ui.shadowDistanceFadeMin.value = String(lightState.shadowDistanceFadeMin);
  if (ui.shadowDistanceFadeMinValue) ui.shadowDistanceFadeMinValue.textContent = Number(lightState.shadowDistanceFadeMin || 0).toFixed(2);
  if (ui.shadowEdgeFadeEnabled) ui.shadowEdgeFadeEnabled.checked = !!lightState.shadowEdgeFadeEnabled;
  if (ui.shadowEdgeFadePx) ui.shadowEdgeFadePx.value = String(lightState.shadowEdgeFadePx);
  if (ui.shadowEdgeFadePxValue) ui.shadowEdgeFadePxValue.textContent = `${Number(lightState.shadowEdgeFadePx || 0).toFixed(1)} px`;
  detailLog(`boot-seq: shadowFlags shadows=${ui.showLightShadows.checked} glow=${ui.showLightGlow.checked} highContrast=${lightState.highContrastShadow} shadowColor=${lightState.shadowDebugColor} shadowAlpha=${lightState.shadowAlpha.toFixed(2)} opacityScale=${lightState.shadowOpacityScale.toFixed(2)} distanceFade=${!!lightState.shadowDistanceFadeEnabled}/${Number(lightState.shadowDistanceFadeRate || 0).toFixed(2)}/${Number(lightState.shadowDistanceFadeMin || 0).toFixed(2)} edgeFade=${!!lightState.shadowEdgeFadeEnabled}/${Number(lightState.shadowEdgeFadePx || 0).toFixed(1)}`);
  syncLightUI();
  updateSceneFileStatus();
  detailLog('boot-seq: syncLightUI ok');
  if (typeof scanAssetPrefabs === 'function') {
    try { scanAssetPrefabs(true); detailLog('boot-seq: asset scan requested'); } catch (err) { detailLog(`boot-seq: asset scan skipped ${err?.message || err}`); }
  }
  requestAnimationFrame(loop);
  detailLog('boot-seq: requestAnimationFrame scheduled');
} catch (err) {
  const detail = formatErrorDetails(err?.message || 'boot finalization failed', 'boot-finalize', 0, 0, err);
  detailLog(`[boot-finalize-error] ${detail}`);
  errorBanner(`启动阶段错误：
${detail}`);
  throw err;
}
})();

if (typeof scanAssetPrefabs === 'function') {
  window.addEventListener('focus', () => { try { scanAssetPrefabs(true); } catch {} });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { try { scanAssetPrefabs(true); } catch {} } });
}
