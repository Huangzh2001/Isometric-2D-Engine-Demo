(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/presentation/render/renderer/canvas2d-overlay-hud-pass.js';
  var PHASE = 'P11c-6';

  function call(deps, name) {
    if (deps && typeof deps[name] === 'function') return deps[name].apply(null, Array.prototype.slice.call(arguments, 2));
    return undefined;
  }

  function getValue(deps, name, fallback) {
    try {
      if (deps && typeof deps[name] === 'function') {
        var value = deps[name]();
        return value == null ? fallback : value;
      }
    } catch (_) {}
    return fallback;
  }

  function drawOverlayPasses(adapterApi, deps, meta) {
    meta = meta || {};
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for overlay/HUD pass');
    adapterApi.__inDrawOverlayPasses = true;
    try {
      var debugState = getValue(deps, 'getDebugState', null);
      if (debugState) debugState.renderStep = 'editor-overlay';
      call(deps, 'drawSelectedInstanceHighlight');
      call(deps, 'drawSelectedInstanceProjectionDebug');
      call(deps, 'drawShadowProbeOverlay');
      var editor = getValue(deps, 'getEditor', {});
      if (editor && editor.mode === 'delete') call(deps, 'drawDeleteHover');
      else call(deps, 'drawPlacementPreview');

      if (debugState) debugState.renderStep = 'light-glow';
      call(deps, 'renderLightingGlow');
      if (debugState) debugState.renderStep = 'light-bulbs';
      var renderLights = getValue(deps, 'getLightingRenderLights', []);
      var activeLightId = getValue(deps, 'getActiveLightId', null);
      for (var i = 0; i < renderLights.length; i += 1) call(deps, 'drawLightingBulb', renderLights[i], renderLights[i].id === activeLightId);
      if (debugState) debugState.renderStep = 'light-axes';
      call(deps, 'drawLightingAxes');
      if (debugState) debugState.renderStep = 'habbo-debug-overlay';
      call(deps, 'drawHabboDebugOverlay');
    } finally {
      adapterApi.__inDrawOverlayPasses = false;
    }
  }

  function safeToFixed(value, digits) {
    var n = Number(value || 0);
    return n.toFixed(digits == null ? 2 : digits);
  }

  function drawHudPass(adapterApi, deps, meta) {
    meta = meta || {};
    if (!adapterApi) throw new Error('Missing Canvas2D adapter API for overlay/HUD pass');
    adapterApi.__inDrawHudPass = true;
    try {
      var debugState = getValue(deps, 'getDebugState', null);
      var ctx = getValue(deps, 'getContext', null);
      if (debugState) debugState.renderStep = 'hud';
      call(deps, 'refreshInspectorPanels');
      var showCanvasDebugText = !!getValue(deps, 'getShowCanvasDebugText', false);
      if (!ctx || !showCanvasDebugText) return;
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '14px sans-serif';

      var proto = getValue(deps, 'currentProto', { name: 'n/a', w: 0, d: 0, h: 0, voxels: [] });
      var editor = getValue(deps, 'getEditor', {});
      var settings = getValue(deps, 'getSettings', {});
      var instances = getValue(deps, 'getInstances', []);
      var boxes = getValue(deps, 'getBoxes', []);
      var light = getValue(deps, 'activeLight', { name: 'n/a', type: 'n/a', x: 0, y: 0, z: 0, angle: 0, pitch: 0 });
      var lightTypeLabels = getValue(deps, 'getLightTypeLabels', {});
      var modeLabel = editor.mode === 'view' ? '不编辑/拖动画面' : (editor.mode === 'delete' ? '删除物件' : '建立物件');
      var playerProxyW = settings && typeof settings.playerProxyW === 'number' ? settings.playerProxyW : 0;
      var playerProxyD = settings && typeof settings.playerProxyD === 'number' ? settings.playerProxyD : 0;
      var playerHeightCells = settings && typeof settings.playerHeightCells === 'number' ? settings.playerHeightCells : 0;
      var ambient = settings && typeof settings.ambient === 'number' ? settings.ambient : 0;

      ctx.fillText('一体化 Demo：房间编辑 + 多光源 + 人物代理体积阴影，可自由组合。', 18, 28);
      ctx.fillText('模式=' + modeLabel + '  当前=' + proto.name + ' ' + proto.w + '×' + proto.d + '×' + proto.h + ' / 体素' + (proto.voxels ? proto.voxels.length : 0) + '  instances=' + instances.length + '  boxes=' + boxes.length + '  人物代理=' + safeToFixed(playerProxyW) + '×' + safeToFixed(playerProxyD) + '×' + safeToFixed(playerHeightCells) + '  环境光=' + safeToFixed(ambient) + '  选中=' + light.name + '(' + (lightTypeLabels[light.type] || light.type || 'n/a') + ')', 18, 50);

      if (editor.preview) {
        var pb = editor.preview.box || null;
        var previewLabel = pb
          ? '预览: (' + pb.x + ', ' + pb.y + ', z=' + pb.z + ') valid=' + editor.preview.valid
          : '预览: box=null valid=' + editor.preview.valid + ' reason=' + (editor.preview.reason || 'n/a') + ' prefab=' + (editor.preview.prefabId || 'n/a') + ' origin=' + (editor.preview.origin ? '(' + editor.preview.origin.x + ',' + editor.preview.origin.y + ',' + editor.preview.origin.z + ')' : 'null') + ' boxes=' + (editor.preview.boxes ? editor.preview.boxes.length : 0);
        if (!pb) call(deps, 'detailLog', '[debug:hud-preview-null] ' + previewLabel);
        ctx.fillText(previewLabel, 18, 72);
      }

      var showDebug = !!getValue(deps, 'getShowDebug', false);
      if (showDebug) {
        var player = getValue(deps, 'getPlayer', { x: 0, y: 0, z: 0, visualZ: 0, dir: 'n/a' });
        var showPlayer = !!getValue(deps, 'getShowPlayer', false);
        ctx.fillText((showPlayer ? 'player=(' + safeToFixed(player.x) + ', ' + safeToFixed(player.y) + ', z=' + safeToFixed(player.z) + ', vZ=' + safeToFixed(player.visualZ) + ') dir=' + player.dir + '  ' : '') + 'light=(' + safeToFixed(light.x) + ',' + safeToFixed(light.y) + ',' + safeToFixed(light.z) + ') angle=' + Number(light.angle || 0).toFixed(0) + ' pitch=' + Number(light.pitch || 0).toFixed(0), 18, 94);
      }

      var shadowProbeState = getValue(deps, 'getShadowProbeState', null);
      if (shadowProbeState) {
        var probeLabel = shadowProbeState.activeMarker ? call(deps, 'shadowProbeMarkerLabel', shadowProbeState.activeMarker) : 'none';
        ctx.fillText('阴影探针: M=标记模式 P=记录当前帧 N=清除  模式=' + (shadowProbeState.markMode ? 'ON' : 'OFF') + '  当前=' + probeLabel, 18, showDebug ? 116 : 94);
      }
    } finally {
      adapterApi.__inDrawHudPass = false;
    }
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    drawOverlayPasses: drawOverlayPasses,
    drawHudPass: drawHudPass
  };

  window.__CANVAS2D_OVERLAY_HUD_PASS__ = api;
  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2dOverlayHudPass', api, { owner: OWNER, phase: PHASE });
      window.__APP_NAMESPACE.bind('renderer.diagnostics.canvas2dOverlayHudPass', { owner: OWNER, phase: PHASE }, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
