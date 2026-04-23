(function () {
  if (typeof window === 'undefined') return;

  function emitP5(kind, message, extra) {
    var line = '[P5][' + String(kind || 'BOOT') + '] ' + String(message || '');
    if (typeof extra !== 'undefined') {
      try { line += ' ' + JSON.stringify(extra); } catch (_) { line += ' "[unserializable]"'; }
    }
    try {
      if (typeof pushLog === 'function') pushLog(line);
      else if (typeof console !== 'undefined' && console.log) console.log(line);
    } catch (err) {
      try { console.log(line); } catch (_) {}
    }
    return line;
  }

  function getNamespacePath(path) {
    try {
      if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.getPath === 'function') {
        return window.__APP_NAMESPACE.getPath(path);
      }
    } catch (_) {}
    return undefined;
  }

  function resolvePassApi() {
    var api = getNamespacePath('renderer.passApi');
    if (api) return api;
    return window.App && window.App.renderer ? window.App.renderer.passApi : null;
  }

  function resolveRenderablesApi() {
    var api = getNamespacePath('renderer.renderablesApi');
    if (api) return api;
    return window.App && window.App.renderer ? window.App.renderer.renderablesApi : null;
  }

  function recordDrawDiagnostic(kind, payload) {
    try {
      var api = getNamespacePath('infrastructure.itemRotationDiagnostic') || window.__ITEM_ROTATION_DIAGNOSTIC__ || null;
      if (api && typeof api.record === 'function') api.record(kind, payload || null);
    } catch (_) {}
  }

  function getRenderableDrawPosition(renderable) {
    if (!renderable) return { x: 0, y: 0 };
    if (renderable.drawScreenPosition && typeof renderable.drawScreenPosition.x === 'number' && typeof renderable.drawScreenPosition.y === 'number') {
      return { x: Math.round(renderable.drawScreenPosition.x), y: Math.round(renderable.drawScreenPosition.y) };
    }
    if (renderable.debugFoot && typeof renderable.debugFoot.x === 'number' && typeof renderable.debugFoot.y === 'number') {
      return { x: Math.round(renderable.debugFoot.x), y: Math.round(renderable.debugFoot.y) };
    }
    if (Array.isArray(renderable.faces) && renderable.faces.length && Array.isArray(renderable.faces[0].points) && renderable.faces[0].points.length && typeof averageScreenPoint === 'function') {
      var mid = averageScreenPoint(renderable.faces[0].points);
      return { x: Math.round(mid.x), y: Math.round(mid.y) };
    }
    return { x: 0, y: 0 };
  }

  function drawRenderableOrder(order, meta) {
    meta = meta || {};
    order = Array.isArray(order) ? order : [];
    var seenDrawHits = Object.create(null);
    var drawStartAt = (typeof perfNow === 'function') ? perfNow() : Date.now();
    var staticPacketCount = 0;
    var dynamicRenderableCount = 0;
    adapterApi.__inDrawRenderableOrder = true;
    try {
      debugState.renderStep = 'draw-renderables';
      for (var i = 0; i < order.length; i++) {
        var r = order[i];
        var isStaticWorldPacket = !!(r && r.kind === 'static-world-face-packet');
        if (isStaticWorldPacket) staticPacketCount += 1;
        else dynamicRenderableCount += 1;
        debugState.lastRenderable = String(i + 1) + '/' + String(order.length) + ':' + String((r && r.kind) || 'unknown') + ':' + String((r && r.id) || 'no-id');
        try {
          if (r && !isStaticWorldPacket) {
            r.currentViewRotation = r.currentViewRotation != null ? r.currentViewRotation : ((meta && typeof meta.currentViewRotation === 'number') ? meta.currentViewRotation : (r.cacheViewRotation != null ? r.cacheViewRotation : 0));
            r.framePlanId = r.framePlanId || meta.framePlanId || null;
            r.__drawIndex = i;
          }
          if (r && typeof r.draw === 'function') r.draw();
          else if (r && r.kind === 'voxel') drawCachedVoxelRenderable(r);
          else if (isStaticWorldPacket && typeof drawStaticWorldFacePacket === 'function') {
            drawStaticWorldFacePacket(r);
          }
          else throw new Error('missing draw for renderable ' + String(r && r.id));
          if (r && typeof drawFaceDebugOverlayRenderable === 'function') drawFaceDebugOverlayRenderable(r, i);
          if (!isStaticWorldPacket && r && (r.instanceId || r.prefabId)) {
            var drawKey = [String(r.framePlanId || 'frameplan:none'), String(r.renderPath || r.kind || 'unknown'), String(r.instanceId || r.id || 'none')].join('|');
            if (!seenDrawHits[drawKey]) {
              seenDrawHits[drawKey] = true;
              recordDrawDiagnostic('main-render-draw-hit', {
                currentViewRotation: Number(r.currentViewRotation || 0),
                cacheViewRotation: r.cacheViewRotation != null ? Number(r.cacheViewRotation) : null,
                instanceId: r.instanceId || null,
                prefabId: r.prefabId || null,
                renderPath: r.renderPath || (r.kind === 'voxel' ? 'static-cache' : (r.kind === 'static-world-face-packet' ? 'static-world-chunk-cache' : 'dynamic-renderables')),
                framePlanId: r.framePlanId || null,
                cacheSignature: r.cacheSignature || null,
                renderSourceId: r.id || null,
                finalDrawScreenPosition: getRenderableDrawPosition(r),
                drawUsedCurrentViewRotation: r.cacheViewRotation != null
                  ? Number(r.cacheViewRotation) === Number(r.currentViewRotation || 0)
                  : true,
                drawUsedSemanticTextureMapping: !!r.drawUsedSemanticTextureMapping
              });
            }
          }
        } catch (err) {
          if (typeof detailLog === 'function') detailLog('[renderable-error] ' + String(debugState.lastRenderable) + ' stack=' + String((err && err.stack) || err));
          throw err;
        }
      }
      var drawMs = Number(Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt).toFixed ? Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt).toFixed(3) : Math.max(0, ((typeof perfNow === 'function') ? perfNow() : Date.now()) - drawStartAt));
      try {
        if (typeof __lastFrameDrawMs !== 'undefined') __lastFrameDrawMs = drawMs;
        if (typeof __lastFrameDrawStats !== 'undefined') {
          __lastFrameDrawStats = {
            drawMs: drawMs,
            renderableCount: Number(order.length || 0),
            staticPacketCount: Number(staticPacketCount || 0),
            dynamicRenderableCount: Number(dynamicRenderableCount || 0)
          };
        }
        if (typeof maybeLogFrameWorkBreakdown === 'function' && typeof __lastMainRenderableBuildStats !== 'undefined' && __lastMainRenderableBuildStats) {
          maybeLogFrameWorkBreakdown({
            cameraX: Number(typeof camera !== 'undefined' && camera && camera.x || 0),
            cameraY: Number(typeof camera !== 'undefined' && camera && camera.y || 0),
            zoom: Number(__lastMainRenderableBuildStats.zoom || (typeof getMainEditorZoomValueForRender === 'function' ? getMainEditorZoomValueForRender() : 1)),
            visibleChunkCount: Number(__lastMainRenderableBuildStats.visibleChunkCount || __lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
            visibleStaticChunkCount: Number(__lastMainRenderableBuildStats.visibleStaticChunkCount || 0),
            visibleStaticPacketCount: Number(__lastMainRenderableBuildStats.visibleStaticPacketCount || 0),
            staticPacketMergeMs: Number(__lastMainRenderableBuildStats.staticPacketMergeMs || 0),
            staticPacketProjectMs: Number(__lastMainRenderableBuildStats.staticPacketProjectMs || 0),
            staticPacketSortMs: Number(__lastMainRenderableBuildStats.staticPacketSortMs || 0),
            staticPacketDrawPrepMs: Number(__lastMainRenderableBuildStats.staticPacketDrawPrepMs || 0),
            dynamicObjectCount: Number(__lastMainRenderableBuildStats.dynamicObjectCount || 0),
            dynamicObjectBuildMs: Number(__lastMainRenderableBuildStats.dynamicBuildMs || 0),
            finalDrawMs: Number(drawMs || 0),
            frameBuildMs: Number(__lastMainRenderableBuildStats.frameBuildMs || 0)
          });
        }
      } catch (_) {}
      return order;
    } finally {
      adapterApi.__inDrawRenderableOrder = false;
    }
  }

  function drawOverlayPasses(meta) {
    meta = meta || {};
    adapterApi.__inDrawOverlayPasses = true;
    try {
      debugState.renderStep = 'editor-overlay';
      drawSelectedInstanceHighlight();
      drawSelectedInstanceProjectionDebug();
      drawShadowProbeOverlay();
      if (editor.mode === 'delete') drawDeleteHover();
      else drawPlacementPreview();
      debugState.renderStep = 'light-glow';
      renderLightingGlow();
      debugState.renderStep = 'light-bulbs';
      var renderLights = typeof getLightingRenderLights === 'function' ? getLightingRenderLights() : [];
      for (var i = 0; i < renderLights.length; i++) drawLightingBulb(renderLights[i], renderLights[i].id === activeLightId);
      debugState.renderStep = 'light-axes';
      drawLightingAxes();
      debugState.renderStep = 'habbo-debug-overlay';
      drawHabboDebugOverlay();
    } finally {
      adapterApi.__inDrawOverlayPasses = false;
    }
  }

  function drawHudPass(meta) {
    meta = meta || {};
    adapterApi.__inDrawHudPass = true;
    try {
      debugState.renderStep = 'hud';
      refreshInspectorPanels();
      ctx.fillStyle = 'rgba(255,255,255,.92)';
      ctx.font = '14px sans-serif';
      var proto = currentProto();
      var modeLabel = editor.mode === 'view' ? '不编辑/拖动画面' : (editor.mode === 'delete' ? '删除物件' : '建立物件');
      var l = activeLight();
      ctx.fillText('一体化 Demo：房间编辑 + 多光源 + 人物代理体积阴影，可自由组合。', 18, 28);
      ctx.fillText('模式=' + modeLabel + '  当前=' + proto.name + ' ' + proto.w + '×' + proto.d + '×' + proto.h + ' / 体素' + proto.voxels.length + '  instances=' + instances.length + '  boxes=' + boxes.length + '  人物代理=' + settings.playerProxyW.toFixed(2) + '×' + settings.playerProxyD.toFixed(2) + '×' + settings.playerHeightCells.toFixed(2) + '  环境光=' + settings.ambient.toFixed(2) + '  选中=' + l.name + '(' + LIGHT_TYPE_LABELS[l.type] + ')', 18, 50);
      if (editor.preview) {
        var pb = editor.preview.box || null;
        var previewLabel = pb
          ? '预览: (' + pb.x + ', ' + pb.y + ', z=' + pb.z + ') valid=' + editor.preview.valid
          : '预览: box=null valid=' + editor.preview.valid + ' reason=' + (editor.preview.reason || 'n/a') + ' prefab=' + (editor.preview.prefabId || 'n/a') + ' origin=' + (editor.preview.origin ? '(' + editor.preview.origin.x + ',' + editor.preview.origin.y + ',' + editor.preview.origin.z + ')' : 'null') + ' boxes=' + (editor.preview.boxes ? editor.preview.boxes.length : 0);
        if (!pb && typeof detailLog === 'function') detailLog('[debug:hud-preview-null] ' + previewLabel);
        ctx.fillText(previewLabel, 18, 72);
      }
      if (showDebug) ctx.fillText((SHOW_PLAYER ? 'player=(' + player.x.toFixed(2) + ', ' + player.y.toFixed(2) + ') dir=' + player.dir + '  ' : '') + 'light=(' + l.x.toFixed(2) + ',' + l.y.toFixed(2) + ',' + l.z.toFixed(2) + ') angle=' + l.angle.toFixed(0) + ' pitch=' + l.pitch.toFixed(0), 18, 94);
      if (typeof shadowProbeState !== 'undefined' && shadowProbeState) {
        var probeLabel = shadowProbeState.activeMarker ? shadowProbeMarkerLabel(shadowProbeState.activeMarker) : 'none';
        ctx.fillText('阴影探针: M=标记模式 P=记录当前帧 N=清除  模式=' + (shadowProbeState.markMode ? 'ON' : 'OFF') + '  当前=' + probeLabel, 18, showDebug ? 116 : 94);
      }
    } finally {
      adapterApi.__inDrawHudPass = false;
    }
  }

  function runFramePipeline(passApi, renderablesApi) {
    passApi.clearAndPaintMainBackground();
    var framePlan = null;
    var runWorldPasses = function () {
      passApi.renderBaseWorldPasses();
      framePlan = renderablesApi && typeof renderablesApi.buildFramePlan === 'function'
        ? renderablesApi.buildFramePlan()
        : { order: passApi.buildMainFrameRenderables() };
      drawRenderableOrder(framePlan.order || [], { source: 'renderer.canvas2d:drawRenderableOrder', framePlanId: framePlan.id || null, currentViewRotation: framePlan.currentViewRotation != null ? framePlan.currentViewRotation : 0 });
      drawOverlayPasses({ source: 'renderer.canvas2d:drawOverlayPasses' });
    };
    if (typeof applyMainCameraWorldTransform === 'function') applyMainCameraWorldTransform(ctx, runWorldPasses);
    else runWorldPasses();
    drawHudPass({ source: 'renderer.canvas2d:drawHudPass' });
    return framePlan || { order: [] };
  }

  function renderFrame(meta) {
    meta = meta || {};
    var passApi = resolvePassApi();
    var renderablesApi = resolveRenderablesApi();
    if (!passApi) throw new Error('renderer.passApi missing for canvas2d renderer');
    adapterApi.__inRenderFrame = true;
    try {
      setPhase('render', 'start');
      if (debugState.firstFrameAt == null) debugState.firstFrameAt = performance.now();
      if (typeof beginRenderFrameDebug === 'function') {
        beginRenderFrameDebug('renderer.canvas2d:renderFrame', {
          canvasCss: { w: VIEW_W, h: VIEW_H },
          backing: { w: canvas.width, h: canvas.height },
          boxes: boxes.length,
          lights: lights.length,
          assetsReady: !!assetsReady,
          source: meta.source || 'unknown'
        });
      }
      if (debugState.frame < 5 || verboseLog) {
        detailLog('renderer-adapter:start frame=' + debugState.frame + ' source=' + String(meta.source || 'unknown') + ' canvasCss=' + VIEW_W + 'x' + VIEW_H + ' backing=' + canvas.width + 'x' + canvas.height);
      }
      var framePlan = runFramePipeline(passApi, renderablesApi);
      debugState.renderStep = 'done';
      if (debugState.frame < 5 || verboseLog) {
        var renderableCount = framePlan && framePlan.order ? framePlan.order.length : 0;
        detailLog('renderer-adapter:done frame=' + debugState.frame + ' renderables=' + renderableCount);
      }
      return framePlan;
    } finally {
      adapterApi.__inRenderFrame = false;
    }
  }

  function summarizeCoverage() {
    return {
      phase: 'P5-D',
      owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
      backend: 'canvas2d',
      passApiPath: 'renderer.passApi',
      renderablesApiPath: 'renderer.renderablesApi',
      activeApiPath: 'renderer.active',
      framePipeline: [
        'clearAndPaintMainBackground',
        'renderBaseWorldPasses',
        'buildFramePlan',
        'drawRenderableOrder',
        'drawOverlayPasses',
        'drawHudPass'
      ],
      wiredInto: [
        'src/presentation/shell/app.js:loop -> renderer.active',
        'src/presentation/render/render.js:render -> renderer.active',
        'src/presentation/render/render.js -> renderer.passApi',
        'src/presentation/render/render.js -> renderer.renderablesApi'
      ],
      notes: [
        'P5-D keeps Canvas2D renderer on renderer.active, but now owns more direct Canvas2D draw execution instead of routing overlay / HUD / renderable loops back through render.js.',
        'render.js remains a render description and fallback layer while adapter executes frame plans, overlay passes, and HUD passes.'
      ]
    };
  }

  var adapterApi = {
    phase: 'P5-D',
    owner: 'src/presentation/render/renderer/canvas2d-renderer.js',
    backend: 'canvas2d',
    __inRenderFrame: false,
    __inDrawRenderableOrder: false,
    __inDrawOverlayPasses: false,
    __inDrawHudPass: false,
    getPassApi: resolvePassApi,
    getRenderablesApi: resolveRenderablesApi,
    runFramePipeline: runFramePipeline,
    drawRenderableOrder: drawRenderableOrder,
    drawOverlayPasses: drawOverlayPasses,
    drawHudPass: drawHudPass,
    renderFrame: renderFrame,
    summarizeCoverage: summarizeCoverage
  };

  try {
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('renderer.canvas2d', adapterApi, { owner: 'src/presentation/render/renderer/canvas2d-renderer.js', phase: 'P5-C' });
      window.__APP_NAMESPACE.bind('renderer.active', adapterApi, { owner: 'src/presentation/render/renderer/canvas2d-renderer.js', phase: 'P5-C' });
    } else {
      window.App = window.App || {};
      window.App.renderer = window.App.renderer || {};
      window.App.renderer.canvas2d = adapterApi;
      window.App.renderer.active = adapterApi;
    }
  } catch (err) {}

  emitP5('BOOT', 'renderer-adapter-ready', {
    phase: 'P5-D',
    owner: adapterApi.owner,
    backend: adapterApi.backend,
    hasCanvas: !!(typeof canvas !== 'undefined' && canvas),
    hasCtx: !!(typeof ctx !== 'undefined' && ctx),
    hasPassApi: !!resolvePassApi(),
    hasRenderablesApi: !!resolveRenderablesApi(),
    wiredInto: summarizeCoverage().wiredInto
  });
  emitP5('SUMMARY', 'renderer-adapter-coverage', summarizeCoverage());
})();
