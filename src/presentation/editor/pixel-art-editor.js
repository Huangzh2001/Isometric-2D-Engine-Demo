(function (global) {
  'use strict';

  var core = global.__HZH_PIXEL_ART_CORE__;
  var workflow = global.__HZH_PIXEL_ART_WORKFLOW__;
  var exporter = global.__HZH_UNIFIED_MATERIAL_EXPORT__;
  var materialStateCore = global.__HZH_MATERIAL_STATE_CORE__;
  var materialStateWorkflow = global.__HZH_MATERIAL_STATE_WORKFLOW__;
  if (!core || !workflow || !exporter || !materialStateCore || !materialStateWorkflow) throw new Error('pixel art editor dependencies missing');

  var VERSION = 'HZH-PIXEL-ART-EDITOR-V7-MATERIAL-STATES';
  var controller = workflow.createController({ width: 32, height: 32, maxHistory: 50 });
  var materialStates = null;
  var editorApi = null;
  var syncTimer = 0;
  var renderQueued = false;
  var spacePressed = false;
  var display = { grid: true, origin: true, focusMode: false };
  var pointer = {
    active: false,
    panning: false,
    button: 0,
    lastPixel: null,
    shapeStart: null,
    shapeEnd: null,
    changed: false,
    startClient: null,
    startPan: null,
    startLayerOffset: null
  };
  var view = { zoom: 16, panX: 0, panY: 0, fitted: false };
  var paletteDefaults = ['#000000','#ffffff','#ff4d6d','#ff9f1c','#ffe66d','#2ec4b6','#3a86ff','#8338ec','#8d5524','#c68642','#e0ac69','#f1c27d','#6a994e','#386641','#6c757d','#adb5bd'];
  var toolLabels = {
    pencil: ['铅笔', '逐像素绘制；右键使用副色。'],
    eraser: ['橡皮', '清除当前图层中的像素。'],
    fill: ['填充', '填充相邻且颜色相同的区域。'],
    picker: ['取色', '从合成画面读取颜色。'],
    line: ['直线', '拖动绘制一条像素直线。'],
    rect: ['矩形', '拖动绘制矩形；按 Shift 填充。'],
    move: ['移动图层', '拖动当前图层；锁定图层不能移动。']
  };

  function byId(id) { return document.getElementById(id); }
  var ui = {
    workspace: byId('imageArtworkWorkspace'), shell: byId('pixelWorkspaceShell'), canvas: byId('pixelArtCanvas'), viewport: byId('pixelCanvasViewport'),
    documentSummary: byId('pixelDocumentSummary'), canvasStatus: byId('pixelCanvasStatus'), cursorStatus: byId('pixelCursorStatus'), zoomLabel: byId('pixelZoomLabel'), topState: byId('pixelTopState'),
    sourceSummary: byId('pixelSourceSummary'), sourceMetadata: byId('pixelSourceMetadata'),
    width: byId('pixelCanvasWidth'), height: byId('pixelCanvasHeight'), paletteLimit: byId('pixelPaletteLimit'),
    newDocument: byId('pixelNewDocument'), importImage: byId('pixelImportImage'), importFile: byId('pixelImportFile'), reimport: byId('pixelReimportImage'), resize: byId('pixelResizeDocument'),
    openProject: byId('pixelOpenProject'), projectFile: byId('pixelProjectFile'),
    undo: byId('pixelUndo'), redo: byId('pixelRedo'), center: byId('pixelCenterView'),
    primary: byId('pixelPrimaryColor'), secondary: byId('pixelSecondaryColor'), alpha: byId('pixelAlpha'), alphaLabel: byId('pixelAlphaLabel'), colorHex: byId('pixelColorHex'), primarySwatch: byId('pixelPrimarySwatch'), swapColors: byId('pixelSwapColors'), palette: byId('pixelPalette'), dockPrimary: byId('pixelDockPrimary'), dockSecondary: byId('pixelDockSecondary'),
    facingGrid: byId('pixelFacingGrid'), copyFacingTarget: byId('pixelCopyFacingTarget'), copyFacing: byId('pixelCopyFacing'),
    layerList: byId('pixelLayerList'), layerCount: byId('pixelLayerCount'), addLayer: byId('pixelAddLayer'), duplicateLayer: byId('pixelDuplicateLayer'), deleteLayer: byId('pixelDeleteLayer'), layerUp: byId('pixelLayerUp'), layerDown: byId('pixelLayerDown'), layerName: byId('pixelLayerName'), layerOpacity: byId('pixelLayerOpacity'), layerOpacityLabel: byId('pixelLayerOpacityLabel'),
    exportMaterial: byId('exportUnifiedMaterial'), importMaterial: byId('importUnifiedMaterial'), materialFile: byId('unifiedMaterialFile'), exportSummary: byId('unifiedExportSummary'),
    gridToggle: byId('pixelGridToggle'), originToggle: byId('pixelOriginToggle'), propertyGrid: byId('pixelPropertyShowGrid'), propertyOrigin: byId('pixelPropertyShowOrigin'),
    leftToggle: byId('pixelToggleLeftDock'), rightToggle: byId('pixelToggleRightDock'), restoreLeft: byId('pixelRestoreLeftDock'), restoreRight: byId('pixelRestoreRightDock'), focus: byId('pixelFocusMode'),
    activeToolName: byId('pixelActiveToolName'), activeToolHint: byId('pixelActiveToolHint'),
    stateBar: byId('materialStateBar'), stateTabs: byId('materialStateTabs'), stateSummary: byId('materialStateSummary'), stateAdd: byId('materialStateAdd'), stateDuplicate: byId('materialStateDuplicate'), stateRename: byId('materialStateRename'), stateDelete: byId('materialStateDelete'), stateMoveLeft: byId('materialStateMoveLeft'), stateMoveRight: byId('materialStateMoveRight'), stateCopyLayer: byId('materialStateCopyLayer'), statePasteLayer: byId('materialStatePasteLayer'), stateCopyFacing: byId('materialStateCopyFacing'), stateTarget: byId('materialStateTarget'), stateTargetFacing: byId('materialStateTargetFacing'), voxelStateLabel: byId('voxelActiveStateLabel')
  };
  var ctx = ui.canvas ? ui.canvas.getContext('2d', { alpha: true }) : null;
  var compositeCanvas = document.createElement('canvas');
  var compositeCtx = compositeCanvas.getContext('2d');

  function getEditorApi() {
    return global.App && global.App.editor && global.App.editor.unifiedV18 ? global.App.editor.unifiedV18 : null;
  }

  function safeClone(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function hexToRgba(hex, alpha) {
    var clean = String(hex || '#000000').replace('#','');
    if (clean.length === 3) clean = clean.split('').map(function (c) { return c + c; }).join('');
    var value = parseInt(clean, 16);
    if (!Number.isFinite(value)) value = 0;
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255, Math.max(0, Math.min(255, Number(alpha) || 0))];
  }

  function rgbaToHex(color) {
    return '#' + color.slice(0,3).map(function (v) { return Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0'); }).join('').toUpperCase();
  }

  function setTopState(message) {
    if (ui.topState) ui.topState.textContent = String(message || '就绪');
  }

  function setStatus(message, ok) {
    if (editorApi && typeof editorApi.setStatus === 'function') editorApi.setStatus(message, ok !== false);
    if (editorApi && typeof editorApi.detailLog === 'function') editorApi.detailLog('pixel-art:' + String(message));
    setTopState(ok === false ? '发生错误' : String(message || '就绪').slice(0, 16));
  }

  function getDocument() { return controller.getDocument(); }

  function activeState() { return materialStates && materialStates.getActiveState ? materialStates.getActiveState() : null; }

  function captureVoxelSnapshot() {
    editorApi = getEditorApi();
    return editorApi && typeof editorApi.getVoxelSnapshot === 'function' ? editorApi.getVoxelSnapshot() : { anchor: { x: 0, y: 0, z: 0 }, voxels: [], grid: { w: 10, h: 10 } };
  }

  function captureSpriteStateSnapshot() {
    editorApi = getEditorApi();
    return editorApi && typeof editorApi.getSpriteStateSnapshot === 'function' ? editorApi.getSpriteStateSnapshot() : { activeFacing: getDocument().activeFacing, facingTransforms: [] };
  }

  function applyMaterialArtwork(serialized, reason) {
    if (!serialized) return;
    if (typeof controller.replaceSerializedDocument === 'function') controller.replaceSerializedDocument(serialized, reason || 'material-state');
    else controller.setSerializedDocument(serialized, reason || 'material-state');
    view.fitted = false;
  }

  function applyMaterialVoxel(snapshot, reason) {
    editorApi = getEditorApi();
    if (editorApi && typeof editorApi.applyVoxelSnapshot === 'function') editorApi.applyVoxelSnapshot(snapshot || {}, reason || 'material-state');
  }

  function applyMaterialSprite(snapshot, reason) {
    editorApi = getEditorApi();
    if (editorApi && typeof editorApi.applySpriteStateSnapshot === 'function') editorApi.applySpriteStateSnapshot(snapshot || {}, reason || 'material-state');
  }

  function attachBundleToPrefab(bundle) {
    editorApi = getEditorApi();
    if (editorApi && typeof editorApi.setMaterialStateBundle === 'function') editorApi.setMaterialStateBundle(bundle);
  }

  function materialStateInitialPayload() {
    editorApi = getEditorApi();
    return {
      id: 'state_0',
      name: '状态 0',
      artwork: controller.getSerializedDocument(),
      voxel: captureVoxelSnapshot(),
      sprite: captureSpriteStateSnapshot(),
      metadata: { createdAt: new Date().toISOString() }
    };
  }

  function initializeMaterialStates(bundle, reason) {
    if (!materialStates) {
      materialStates = materialStateWorkflow.createController({
        initial: materialStateInitialPayload(),
        adapters: {
          captureArtwork: function () { return controller.getSerializedDocument(); },
          applyArtwork: applyMaterialArtwork,
          captureVoxel: captureVoxelSnapshot,
          applyVoxel: applyMaterialVoxel,
          captureSprite: captureSpriteStateSnapshot,
          applySprite: applyMaterialSprite,
          afterApply: function (state, applyReason) {
            syncToPrefab();
            view.fitted = false;
            requestAnimationFrame(function () { fitView(); renderMaterialStateBar(); });
            setStatus('已切换状态：' + state.name);
          },
          onBundleChanged: attachBundleToPrefab
        }
      });
      materialStates.subscribe(function (event) {
        renderMaterialStateBar();
        editorApi = getEditorApi();
        if (editorApi && typeof editorApi.detailLog === 'function') {
          var state = event && event.activeState;
          editorApi.detailLog('material-state:event type=' + String(event && event.type || 'unknown') + ' active=' + String(state && state.id || '') + ' count=' + String(event && event.bundle && event.bundle.states ? event.bundle.states.length : 0));
        }
      });
    }
    if (bundle) materialStates.initialize(bundle, reason || 'material-state-initialize');
    else attachBundleToPrefab(materialStates.exportBundle());
    renderMaterialStateBar();
    return materialStates;
  }

  function renderMaterialStateBar() {
    if (!ui.stateTabs || !materialStates) return;
    var bundle = materialStates.getBundle();
    var active = materialStates.getActiveState();
    ui.stateTabs.innerHTML = '';
    bundle.states.forEach(function (state, index) {
      var button = document.createElement('button');
      button.type = 'button'; button.className = 'materialStateTab'; button.dataset.stateId = state.id;
      button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', active && active.id === state.id ? 'true' : 'false');
      button.textContent = state.name;
      var badge = document.createElement('small'); badge.textContent = String(index + 1); button.appendChild(badge);
      button.addEventListener('click', function () { materialStates.switchState(state.id, 'state-tab'); });
      button.addEventListener('dblclick', function () { renameActiveMaterialState(state.id); });
      ui.stateTabs.appendChild(button);
    });
    if (ui.stateSummary) ui.stateSummary.textContent = bundle.states.length + ' 个状态 · 当前：' + (active ? active.name : '—') + ' · 每个状态独立保存体素';
    if (ui.voxelStateLabel) ui.voxelStateLabel.textContent = active ? ('当前状态：' + active.name) : '当前状态：—';
    if (ui.stateTarget) {
      var previous = ui.stateTarget.value;
      ui.stateTarget.innerHTML = '';
      bundle.states.forEach(function (state) { var option = document.createElement('option'); option.value = state.id; option.textContent = state.name; ui.stateTarget.appendChild(option); });
      if (bundle.states.some(function (state) { return state.id === previous; })) ui.stateTarget.value = previous;
      else if (active) ui.stateTarget.value = active.id;
    }
    attachBundleToPrefab(materialStates.exportBundle());
  }

  function renameActiveMaterialState(stateId) {
    if (!materialStates) return;
    var state = materialStateCore.getState(materialStates.getBundle(), stateId || materialStates.getBundle().activeStateId);
    if (!state) return;
    var name = global.prompt('状态名称', state.name);
    if (name && name.trim()) { materialStates.renameState(state.id, name.trim()); setStatus('状态已重命名：' + name.trim()); }
  }

  function exportMaterialStateBundles() {
    if (!materialStates) initializeMaterialStates(null, 'export-init');
    var bundle = materialStates.exportBundle();
    attachBundleToPrefab(bundle);
    return materialStateCore.compatibilityBundles(bundle);
  }

  function restoreMaterialStatesFromPackage(pkg, reason) {
    var fallback = materialStateInitialPayload();
    var bundle = materialStateCore.fromPackage(pkg || {}, fallback);
    initializeMaterialStates(bundle, reason || 'material-import');
    return bundle;
  }

  function activeCompositePixels() {
    var doc = getDocument();
    return core.compositeFacing(doc, doc.activeFacing);
  }

  function pixelsToDataUrl(pixels, width, height) {
    compositeCanvas.width = width;
    compositeCanvas.height = height;
    compositeCtx.clearRect(0,0,width,height);
    compositeCtx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
    return compositeCanvas.toDataURL('image/png');
  }

  function scheduleSyncToPrefab(immediate) {
    if (syncTimer) { clearTimeout(syncTimer); syncTimer = 0; }
    setTopState('有未同步更改');
    if (immediate) return syncToPrefab();
    syncTimer = setTimeout(syncToPrefab, 140);
  }

  function syncToPrefab() {
    syncTimer = 0;
    editorApi = getEditorApi();
    if (!editorApi || typeof editorApi.applyArtworkDocument !== 'function') return false;
    var doc = getDocument();
    var serialized = core.serializeDocument(doc);
    var dataUrl = pixelsToDataUrl(activeCompositePixels(), doc.width, doc.height);
    var currentSource = typeof editorApi.getSourceType === 'function' ? String(editorApi.getSourceType() || '') : '';
    var sourceType = currentSource === 'habbo' ? 'habbo' : (doc.metadata && doc.metadata.sourceType ? doc.metadata.sourceType : 'pixel-artwork');
    var registration = registrationPoint(doc);
    editorApi.applyArtworkDocument({
      document: serialized,
      activeFacing: doc.activeFacing,
      compositeDataUrl: dataUrl,
      fileName: 'artwork-facing-' + doc.activeFacing + '.png',
      spriteScale: 1,
      offsetX: -registration.x,
      offsetY: -registration.y,
      sourceType: sourceType
    });
    setTopState('已同步');
    return true;
  }

  function setBodyStep(step) {
    document.body.dataset.editorStep = step || 'image';
    if (step === 'image') {
      requestAnimationFrame(function () { resizeCanvas(); if (!view.fitted) fitView(); render(); });
    }
  }

  function resizeCanvas() {
    if (!ui.canvas || !ui.viewport) return;
    var rect = ui.viewport.getBoundingClientRect();
    var dpr = Math.max(1, Math.min(2, global.devicePixelRatio || 1));
    var width = Math.max(320, Math.round(rect.width));
    var height = Math.max(360, Math.round(rect.height));
    var nextW = Math.round(width * dpr), nextH = Math.round(height * dpr);
    if (ui.canvas.width !== nextW || ui.canvas.height !== nextH) {
      ui.canvas.width = nextW; ui.canvas.height = nextH;
      ui.canvas.style.width = width + 'px'; ui.canvas.style.height = height + 'px';
      render();
    }
  }

  function canvasCssSize() {
    var rect = ui.canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height, dpr: ui.canvas.width / Math.max(1, rect.width) };
  }

  function fitView() {
    var size = canvasCssSize();
    var doc = getDocument();
    view.zoom = Math.max(1, Math.min(96, Math.floor(Math.min((size.width - 70) / doc.width, (size.height - 70) / doc.height))));
    view.panX = (size.width - doc.width * view.zoom) / 2;
    view.panY = (size.height - doc.height * view.zoom) / 2;
    view.fitted = true;
    updateZoomLabel();
    render();
  }

  function updateZoomLabel() {
    if (ui.zoomLabel) ui.zoomLabel.textContent = Math.round(view.zoom * 100 / 16) + '%';
  }

  function pointerToCanvasCss(event) {
    var rect = ui.canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function cssToPixel(point) {
    var doc = getDocument();
    var x = Math.floor((point.x - view.panX) / view.zoom);
    var y = Math.floor((point.y - view.panY) / view.zoom);
    if (x < 0 || y < 0 || x >= doc.width || y >= doc.height) return null;
    return { x: x, y: y };
  }

  function drawCheckerboard(context, x, y, width, height, cell) {
    cell = Math.max(4, Math.min(16, cell));
    context.save();
    context.beginPath(); context.rect(x,y,width,height); context.clip();
    for (var py = 0; py < height; py += cell) {
      for (var px = 0; px < width; px += cell) {
        context.fillStyle = ((Math.floor(px/cell)+Math.floor(py/cell)) % 2) ? '#b8b8b8' : '#dedede';
        context.fillRect(x+px,y+py,cell,cell);
      }
    }
    context.restore();
  }

  function renderCompositeTo(context, pixels, width, height, x, y, drawW, drawH) {
    compositeCanvas.width = width; compositeCanvas.height = height;
    compositeCtx.clearRect(0,0,width,height);
    compositeCtx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height),0,0);
    context.imageSmoothingEnabled = false;
    context.drawImage(compositeCanvas, x, y, drawW, drawH);
  }

  function renderShapePreview(context) {
    if (!pointer.shapeStart || !pointer.shapeEnd) return;
    context.save();
    context.strokeStyle = '#ffcb46';
    context.lineWidth = 1;
    context.setLineDash([4,3]);
    var x0=view.panX+pointer.shapeStart.x*view.zoom+.5, y0=view.panY+pointer.shapeStart.y*view.zoom+.5;
    var x1=view.panX+(pointer.shapeEnd.x+1)*view.zoom-.5, y1=view.panY+(pointer.shapeEnd.y+1)*view.zoom-.5;
    if (controller.getState().tool === 'line') {
      context.beginPath(); context.moveTo(x0,y0); context.lineTo(x1,y1); context.stroke();
    } else {
      var minX = Math.min(pointer.shapeStart.x,pointer.shapeEnd.x);
      var maxX = Math.max(pointer.shapeStart.x,pointer.shapeEnd.x);
      var minY = Math.min(pointer.shapeStart.y,pointer.shapeEnd.y);
      var maxY = Math.max(pointer.shapeStart.y,pointer.shapeEnd.y);
      context.strokeRect(view.panX+minX*view.zoom+.5, view.panY+minY*view.zoom+.5, (maxX-minX+1)*view.zoom-1, (maxY-minY+1)*view.zoom-1);
    }
    context.restore();
  }

  function registrationPoint(doc) {
    var p = doc && doc.metadata && doc.metadata.registrationPx;
    if (p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) return { x:Number(p.x), y:Number(p.y) };
    return { x: doc.width / 2, y: doc.height };
  }

  function renderOrigin(context, doc) {
    if (!display.origin) return;
    var p = registrationPoint(doc);
    var x = view.panX + p.x * view.zoom;
    var y = view.panY + p.y * view.zoom;
    context.save();
    context.strokeStyle = '#ffd34d';
    context.fillStyle = '#ffd34d';
    context.lineWidth = 1.5;
    context.beginPath(); context.arc(x,y,5,0,Math.PI*2); context.stroke();
    context.beginPath(); context.moveTo(x-11,y); context.lineTo(x+11,y); context.moveTo(x,y-11); context.lineTo(x,y+11); context.stroke();
    context.restore();
  }

  function render() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(function () {
      renderQueued = false;
      if (!ctx || document.body.dataset.editorStep !== 'image') return;
      var size = canvasCssSize();
      var dpr = size.dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,size.width,size.height);
      ctx.fillStyle = '#24282d'; ctx.fillRect(0,0,size.width,size.height);
      var doc = getDocument();
      var drawW = doc.width * view.zoom, drawH = doc.height * view.zoom;
      drawCheckerboard(ctx, view.panX, view.panY, drawW, drawH, Math.max(5, Math.min(12, view.zoom)));
      renderCompositeTo(ctx, activeCompositePixels(), doc.width, doc.height, view.panX, view.panY, drawW, drawH);
      ctx.strokeStyle = '#8da7c0'; ctx.lineWidth = 1; ctx.strokeRect(view.panX+.5,view.panY+.5,drawW-1,drawH-1);
      if (display.grid && view.zoom >= 7) {
        ctx.strokeStyle = 'rgba(40,48,58,.34)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (var x=1;x<doc.width;x+=1) { var gx=view.panX+x*view.zoom+.5; ctx.moveTo(gx,view.panY); ctx.lineTo(gx,view.panY+drawH); }
        for (var y=1;y<doc.height;y+=1) { var gy=view.panY+y*view.zoom+.5; ctx.moveTo(view.panX,gy); ctx.lineTo(view.panX+drawW,gy); }
        ctx.stroke();
      }
      renderOrigin(ctx, doc);
      renderShapePreview(ctx);
      updateFacingThumbnails();
      updateSummary();
    });
  }

  function renderSmallCanvas(canvas, pixels, width, height) {
    if (!canvas) return;
    var c = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    c.clearRect(0,0,w,h);
    drawCheckerboard(c,0,0,w,h,5);
    var scale = Math.min((w-4)/width,(h-4)/height);
    var drawW=width*scale, drawH=height*scale;
    renderCompositeTo(c,pixels,width,height,(w-drawW)/2,(h-drawH)/2,drawW,drawH);
  }

  function updateFacingThumbnails() {
    if (!ui.facingGrid) return;
    var doc = getDocument();
    ui.facingGrid.querySelectorAll('.facingCard').forEach(function (card) {
      var index = Number(card.dataset.facing)||0;
      card.classList.toggle('activeFacingCard', index===doc.activeFacing);
      card.setAttribute('aria-pressed', index===doc.activeFacing ? 'true':'false');
      renderSmallCanvas(card.querySelector('canvas'), core.compositeFacing(doc,index), doc.width, doc.height);
    });
  }

  function renderLayerThumbnail(canvas, layer) {
    var doc=getDocument(); var pixels=core.renderLayerToDocumentPixels?core.renderLayerToDocumentPixels(layer,doc.width,doc.height):layer.pixels; renderSmallCanvas(canvas, pixels, doc.width, doc.height);
  }

  function updateLayers() {
    if (!ui.layerList) return;
    var facing = controller.getActiveFacing();
    var active = controller.getActiveLayer();
    ui.layerList.innerHTML='';
    facing.layers.forEach(function (layer,index) {
      var row=document.createElement('div'); row.className='pixelLayerRow'+(active&&active.id===layer.id?' activeLayerRow':''); row.dataset.layerId=layer.id;
      var vis=document.createElement('button'); vis.type='button'; vis.className='pixelLayerVisibility'; vis.textContent=layer.visible?'●':'○'; vis.title=layer.visible?'隐藏图层':'显示图层';
      var lock=document.createElement('button'); lock.type='button'; lock.className='pixelLayerLock'; lock.textContent=layer.locked?'◆':'◇'; lock.title=layer.locked?'解锁图层':'锁定图层';
      var thumb=document.createElement('canvas'); thumb.width=78; thumb.height=60; thumb.className='pixelLayerThumb'; renderLayerThumbnail(thumb,layer);
      var meta=document.createElement('div'); meta.className='pixelLayerMeta';
      var nameText=document.createElement('div'); nameText.className='pixelLayerNameText'; nameText.textContent=layer.name;
      var sourceLabel=layer.source&&layer.source.kind?(' · '+layer.source.kind):'';
      var subText=document.createElement('div'); subText.className='pixelLayerSub'; var layerOffset=core.getLayerOffset?core.getLayerOffset(layer):(layer.offsetPx||{x:0,y:0}); subText.textContent=Math.round(layer.opacity*100)+'% · '+(index+1)+sourceLabel+(layerOffset.x||layerOffset.y?' · Δ '+layerOffset.x+','+layerOffset.y:'');
      meta.append(nameText,subText);
      vis.addEventListener('click',function(e){e.stopPropagation();controller.setLayerVisibility(layer.id,!layer.visible);});
      lock.addEventListener('click',function(e){e.stopPropagation();controller.setLayerLocked(layer.id,!layer.locked);});
      row.addEventListener('click',function(){controller.setActiveLayer(layer.id);});
      row.addEventListener('dblclick',function(){controller.setActiveLayer(layer.id); if(ui.layerName){ui.layerName.focus();ui.layerName.select();}});
      row.append(vis,lock,thumb,meta); ui.layerList.appendChild(row);
    });
    if (ui.layerCount) ui.layerCount.textContent=String(facing.layers.length);
    if (active) {
      ui.layerName.value=active.name; ui.layerOpacity.value=String(Math.round(active.opacity*100)); ui.layerOpacityLabel.textContent=Math.round(active.opacity*100)+'%';
    }
  }

  function updatePalette() {
    if (!ui.palette) return;
    var colors=(getDocument().palette&&getDocument().palette.length?getDocument().palette:paletteDefaults).slice(0,64);
    ui.palette.innerHTML='';
    colors.forEach(function (hex) {
      var button=document.createElement('button'); button.type='button'; button.className='paletteColor'; button.style.background=hex; button.title=hex;
      button.addEventListener('click',function(){ui.primary.value=hex;applyColorsFromUi();});
      ui.palette.appendChild(button);
    });
  }

  function sourceDescription(doc) {
    var meta = doc.metadata || {};
    if (meta.habboImport) {
      var h = meta.habboImport;
      return { short:'来源：Habbo SWF · '+String(h.type||h.fileName||'未命名'), full:'Habbo SWF：'+String(h.fileName||'')+'\n类型：'+String(h.type||'')+'\n解析尺寸：'+String(h.preferredSize||'')+'\n四方向与图层已转换为通用图片数据。' };
    }
    if (meta.lastImport) {
      return { short:'来源：普通图片 · '+meta.lastImport.sourceWidth+'×'+meta.lastImport.sourceHeight, full:'普通图片导入\n原始尺寸：'+meta.lastImport.sourceWidth+' × '+meta.lastImport.sourceHeight+'\n工作尺寸：'+meta.lastImport.targetWidth+' × '+meta.lastImport.targetHeight+'\n颜色限制：'+(meta.lastImport.paletteLimit||'不限制') };
    }
    return { short:'来源：空白素材', full:'当前素材尚未从外部文件导入。' };
  }

  function updateSummary() {
    var doc=getDocument(), state=controller.getState(), facing=controller.getActiveFacing(), layer=controller.getActiveLayer();
    if (ui.documentSummary) ui.documentSummary.textContent=doc.width+' × '+doc.height+' px · '+facing.name+' · '+facing.layers.length+' 个图层';
    if (ui.canvasStatus) ui.canvasStatus.textContent=doc.width+' × '+doc.height+' px · '+facing.name+' · '+(layer?layer.name:'无图层');
    if (ui.width) ui.width.value=String(doc.width); if(ui.height)ui.height.value=String(doc.height);
    if (ui.undo) ui.undo.disabled=!state.canUndo; if(ui.redo)ui.redo.disabled=!state.canRedo;
    var source=sourceDescription(doc); if(ui.sourceSummary)ui.sourceSummary.textContent=source.short;if(ui.sourceMetadata)ui.sourceMetadata.textContent=source.full;
    updateZoomLabel();
  }

  function updateAll() { updateLayers(); updatePalette(); updateSummary(); renderMaterialStateBar(); render(); }

  function applyColorsFromUi() {
    var alpha=Number(ui.alpha.value)||0;
    var primary=hexToRgba(ui.primary.value,alpha), secondary=hexToRgba(ui.secondary.value,255);
    controller.setPrimaryColor(primary); controller.setSecondaryColor(secondary);
    ui.alphaLabel.textContent=String(alpha); ui.colorHex.textContent=rgbaToHex(primary); ui.primarySwatch.style.background='rgba('+primary[0]+','+primary[1]+','+primary[2]+','+(primary[3]/255)+')';
    if(ui.dockPrimary)ui.dockPrimary.style.background='rgba('+primary[0]+','+primary[1]+','+primary[2]+','+(primary[3]/255)+')';
    if(ui.dockSecondary)ui.dockSecondary.style.background=ui.secondary.value;
  }

  function setTool(tool) {
    controller.setTool(tool);
    document.querySelectorAll('[data-pixel-tool]').forEach(function (button){button.classList.toggle('activeTool',button.dataset.pixelTool===tool);});
    var info=toolLabels[tool]||[tool,'']; if(ui.activeToolName)ui.activeToolName.textContent=info[0];if(ui.activeToolHint)ui.activeToolHint.textContent=info[1];
    if(ui.canvas) ui.canvas.style.cursor=tool==='picker'?'copy':tool==='fill'?'cell':tool==='move'?'move':'crosshair';
  }

  function importImageFile(file) {
    if (!file) return;
    var url=URL.createObjectURL(file), image=new Image();
    image.onload=function(){
      try {
        var off=document.createElement('canvas'); off.width=image.naturalWidth; off.height=image.naturalHeight;
        var c=off.getContext('2d',{willReadFrequently:true}); c.drawImage(image,0,0);
        var data=c.getImageData(0,0,off.width,off.height);
        controller.importPixels(data.data,off.width,off.height,{width:Number(ui.width.value)||32,height:Number(ui.height.value)||32,paletteLimit:Number(ui.paletteLimit.value)||0,newLayer:true,layerName:file.name.replace(/\.[^.]+$/,'')});
        var doc=getDocument();doc.metadata.sourceType='image';doc.metadata.sourceFileName=file.name;doc.metadata.registrationPx=doc.metadata.registrationPx||{x:doc.width/2,y:doc.height};
        view.fitted=false; fitView(); scheduleSyncToPrefab(true); setStatus('已导入并像素化：'+file.name+' → '+doc.width+'×'+doc.height);
      } catch(err){setStatus('图片导入失败：'+(err.message||err),false);} finally {URL.revokeObjectURL(url);ui.importFile.value='';}
    };
    image.onerror=function(){URL.revokeObjectURL(url);setStatus('图片加载失败：'+file.name,false);}; image.src=url;
  }

  function activePointerPixel(event) { return cssToPixel(pointerToCanvasCss(event)); }

  function onPointerDown(event) {
    if (event.button===1 || spacePressed) {
      pointer.active=true; pointer.panning=true; pointer.startClient={x:event.clientX,y:event.clientY}; pointer.startPan={x:view.panX,y:view.panY}; ui.canvas.setPointerCapture(event.pointerId); event.preventDefault(); return;
    }
    if (event.button!==0 && event.button!==2) return;
    var pixel=activePointerPixel(event); if(!pixel)return;
    var tool=controller.getState().tool; var activeLayer=controller.getActiveLayer();
    if(activeLayer&&activeLayer.locked&&tool!=='picker'){setStatus('当前图层已锁定',false);return;}
    pointer.active=true;pointer.panning=false;pointer.button=event.button;pointer.lastPixel=pixel;pointer.changed=false;ui.canvas.setPointerCapture(event.pointerId);
    if(tool==='line'||tool==='rect'){pointer.shapeStart=pixel;pointer.shapeEnd=pixel;render();return;}
    if(tool==='move'){
      pointer.startClient={x:event.clientX,y:event.clientY};
      pointer.startLayerOffset=core.getLayerOffset(controller.getActiveLayer());
      controller.beginTransaction('移动图层');return;
    }
    if(tool==='picker'){
      var pixels=activeCompositePixels(),o=(pixel.y*getDocument().width+pixel.x)*4,color=[pixels[o],pixels[o+1],pixels[o+2],pixels[o+3]];
      ui.primary.value=rgbaToHex(color);ui.alpha.value=String(color[3]);applyColorsFromUi();setStatus('已取色 '+rgbaToHex(color));pointer.active=false;return;
    }
    if(tool==='fill'){controller.applyToolAt(pixel.x,pixel.y,{secondary:event.button===2});pointer.active=false;scheduleSyncToPrefab(false);return;}
    controller.beginTransaction(tool==='eraser'?'擦除像素':'绘制像素');
    pointer.changed=controller.drawPoint(pixel.x,pixel.y,event.button===2)||pointer.changed;render();
  }

  function onPointerMove(event) {
    var point=pointerToCanvasCss(event), pixel=cssToPixel(point);
    if(ui.cursorStatus)ui.cursorStatus.textContent=pixel?'像素：'+pixel.x+', '+pixel.y:'像素：—';
    if(!pointer.active)return;
    if(pointer.panning){view.panX=pointer.startPan.x+(event.clientX-pointer.startClient.x);view.panY=pointer.startPan.y+(event.clientY-pointer.startClient.y);render();return;}
    var tool=controller.getState().tool;
    if(tool==='move'){
      var layer=controller.getActiveLayer();
      if(layer&&pointer.startClient&&pointer.startLayerOffset){
        var totalDx=Math.round((event.clientX-pointer.startClient.x)/Math.max(0.0001,view.zoom));
        var totalDy=Math.round((event.clientY-pointer.startClient.y)/Math.max(0.0001,view.zoom));
        var current=core.getLayerOffset(layer);
        var wantedX=pointer.startLayerOffset.x+totalDx,wantedY=pointer.startLayerOffset.y+totalDy;
        if(wantedX!==current.x||wantedY!==current.y){pointer.changed=controller.translateActiveLayer(wantedX-current.x,wantedY-current.y)||pointer.changed;render();}
      }
      return;
    }
    if(!pixel)return;
    if(tool==='line'||tool==='rect'){pointer.shapeEnd=pixel;render();return;}
    if(tool!=='pencil'&&tool!=='eraser')return;
    var layer=controller.getActiveLayer(),color=tool==='eraser'?[0,0,0,0]:(pointer.button===2?controller.getState().secondaryColor:controller.getState().primaryColor);
    if(pointer.lastPixel) pointer.changed=core.drawLine(getDocument(),layer,pointer.lastPixel.x,pointer.lastPixel.y,pixel.x,pixel.y,color)>0||pointer.changed;
    pointer.lastPixel=pixel;render();
  }

  function finishPointer(event) {
    if(!pointer.active)return;
    try{ui.canvas.releasePointerCapture(event.pointerId);}catch(_){ }
    var tool=controller.getState().tool;
    if(pointer.panning){pointer.active=false;pointer.panning=false;return;}
    if((tool==='line'||tool==='rect')&&pointer.shapeStart&&pointer.shapeEnd){
      if(tool==='line')controller.drawLine(pointer.shapeStart.x,pointer.shapeStart.y,pointer.shapeEnd.x,pointer.shapeEnd.y,pointer.button===2);
      else controller.drawRect(pointer.shapeStart.x,pointer.shapeStart.y,pointer.shapeEnd.x,pointer.shapeEnd.y,pointer.button===2,event.shiftKey);
    } else if(tool==='pencil'||tool==='eraser'||tool==='move') controller.commitTransaction(pointer.changed);
    pointer.active=false;pointer.shapeStart=null;pointer.shapeEnd=null;pointer.lastPixel=null;pointer.startLayerOffset=null;pointer.changed=false;scheduleSyncToPrefab(false);render();
  }

  function onWheel(event) {
    event.preventDefault(); var point=pointerToCanvasCss(event); var beforeX=(point.x-view.panX)/view.zoom,beforeY=(point.y-view.panY)/view.zoom;
    var factor=event.deltaY<0?1.15:1/1.15;view.zoom=Math.max(.75,Math.min(128,view.zoom*factor));view.panX=point.x-beforeX*view.zoom;view.panY=point.y-beforeY*view.zoom;view.fitted=true;updateZoomLabel();render();
  }

  function setDockState(side, state) {
    if(!ui.shell)return;
    var attr=side==='left'?'data-left-dock':'data-right-dock';
    var value=['expanded','compact','hidden'].includes(state)?state:'expanded';
    ui.shell.setAttribute(attr,value);
    try{localStorage.setItem('hzhPixelEditor.'+side+'Dock',value);}catch(_){ }
    requestAnimationFrame(function(){resizeCanvas();render();});
  }

  function cycleDock(side) {
    var attr=side==='left'?'data-left-dock':'data-right-dock';
    var current=ui.shell.getAttribute(attr)||'expanded';
    setDockState(side,current==='expanded'?'compact':current==='compact'?'hidden':'expanded');
  }

  function restoreDockPreferences() {
    try{setDockState('left',localStorage.getItem('hzhPixelEditor.leftDock')||'expanded');setDockState('right',localStorage.getItem('hzhPixelEditor.rightDock')||'expanded');}catch(_){setDockState('left','expanded');setDockState('right','expanded');}
  }

  function toggleFocusMode(force) {
    display.focusMode=typeof force==='boolean'?force:!display.focusMode;
    if(ui.workspace)ui.workspace.classList.toggle('focusMode',display.focusMode);
    if(ui.focus){ui.focus.classList.toggle('toggled',display.focusMode);ui.focus.setAttribute('aria-pressed',display.focusMode?'true':'false');}
    requestAnimationFrame(function(){resizeCanvas();fitView();});
  }

  function setInspectorTab(name) {
    document.querySelectorAll('[data-inspector-tab]').forEach(function(button){var active=button.dataset.inspectorTab===name;button.classList.toggle('activeInspectorTab',active);button.setAttribute('aria-selected',active?'true':'false');});
    document.querySelectorAll('[data-inspector-panel]').forEach(function(panel){panel.classList.toggle('activeInspectorPanel',panel.dataset.inspectorPanel===name);});
    try{localStorage.setItem('hzhPixelEditor.inspectorTab',name);}catch(_){ }
  }

  function setDisplayOption(key,value) {
    display[key]=!!value;
    if(key==='grid'){
      if(ui.gridToggle){ui.gridToggle.classList.toggle('toggled',display.grid);ui.gridToggle.setAttribute('aria-pressed',display.grid?'true':'false');}
      if(ui.propertyGrid)ui.propertyGrid.checked=display.grid;
    }
    if(key==='origin'){
      if(ui.originToggle){ui.originToggle.classList.toggle('toggled',display.origin);ui.originToggle.setAttribute('aria-pressed',display.origin?'true':'false');}
      if(ui.propertyOrigin)ui.propertyOrigin.checked=display.origin;
    }
    render();
  }

  async function exportUnifiedMaterial() {
    editorApi=getEditorApi(); syncToPrefab();
    var stateBundles=exportMaterialStateBundles();
    var prefab=editorApi&&typeof editorApi.getPrefabDraft==='function'?editorApi.getPrefabDraft():{};
    var active=materialStates&&materialStates.getActiveState?materialStates.getActiveState():null;
    var voxel=active?materialStateCore.clone(active.voxel):(editorApi&&typeof editorApi.getVoxelSnapshot==='function'?editorApi.getVoxelSnapshot():{anchor:{x:0,y:0,z:0},voxels:[]});
    var artwork=active?materialStateCore.clone(active.artwork):controller.getSerializedDocument();
    prefab.materialStates=stateBundles.materialStates; prefab.activeStateId=stateBundles.materialStates.activeStateId;
    var packageData={format:'hzh-unified-material-v1',version:2,createdAt:new Date().toISOString(),editor:{version:VERSION},prefab:prefab,artwork:artwork,voxel:voxel,materialStates:stateBundles.materialStates,artworkStateBundle:stateBundles.artworkStateBundle,voxelStateBundle:stateBundles.voxelStateBundle};
    try{
      var result=await exporter.exportMaterial(packageData,prefab.name||prefab.id||'material');
      var ratio=result.rawBytes?Math.round(result.outputBytes/result.rawBytes*100):100;
      ui.exportSummary.textContent='已导出 '+result.filename+' · '+result.compression+' · '+result.rawBytes+' → '+result.outputBytes+' bytes（'+ratio+'%）'; setStatus('统一素材已导出：'+result.filename);
    }catch(err){setStatus('统一素材导出失败：'+(err.message||err),false);}
  }

  async function importMaterialFile(file) {
    try{
      var pkg=await exporter.parseMaterialFile(file);
      if(pkg.prefab&&editorApi&&typeof editorApi.loadPrefabDraft==='function')editorApi.loadPrefabDraft(pkg.prefab,'已载入统一素材 '+file.name);
      restoreMaterialStatesFromPackage(pkg,'import-material');
      view.fitted=false;fitView();scheduleSyncToPrefab(true);setStatus('已导入统一素材：'+file.name+' · '+materialStates.getBundle().states.length+' 个状态');
    }catch(err){setStatus('统一素材导入失败：'+(err.message||err),false);}finally{ui.materialFile.value='';ui.projectFile.value='';}
  }

  async function openProjectFile(file) {
    if(!file)return;
    if(/\.hzhmat$/i.test(file.name)){await importMaterialFile(file);return;}
    try{
      var parsed=JSON.parse(await file.text());
      if(parsed.format==='hzh-unified-material-v1'){if(parsed.prefab&&editorApi&&editorApi.loadPrefabDraft)editorApi.loadPrefabDraft(parsed.prefab);restoreMaterialStatesFromPackage(parsed,'open-unified-material');}
      else if(parsed.version===core.VERSION||Array.isArray(parsed.facings)){controller.setSerializedDocument(parsed,'open-artwork-json');initializeMaterialStates(materialStateCore.createBundle(Object.assign(materialStateInitialPayload(),{artwork:parsed})),'open-artwork-json');}
      else if(parsed.artwork){if(parsed.id&&editorApi&&editorApi.loadPrefabDraft)editorApi.loadPrefabDraft(parsed);restoreMaterialStatesFromPackage(parsed,'open-prefab-artwork');}
      else throw new Error('无法识别的图片工程格式');
      view.fitted=false;fitView();scheduleSyncToPrefab(true);setStatus('已打开图片工程：'+file.name);
    }catch(err){setStatus('打开工程失败：'+(err.message||err),false);}finally{ui.projectFile.value='';}
  }

  function bindUi() {
    document.querySelectorAll('[data-pixel-tool]').forEach(function(button){button.addEventListener('click',function(){setTool(button.dataset.pixelTool);});});
    ui.newDocument.addEventListener('click',function(){var doc=core.createDocument(Number(ui.width.value)||32,Number(ui.height.value)||32,{metadata:{sourceType:'blank',registrationPx:{x:(Number(ui.width.value)||32)/2,y:Number(ui.height.value)||32}}});controller.setDocument(doc,'new');view.fitted=false;fitView();scheduleSyncToPrefab(true);setStatus('已新建四方向空白图片');});
    ui.importImage.addEventListener('click',function(){ui.importFile.click();}); ui.reimport.addEventListener('click',function(){ui.importFile.click();}); ui.importFile.addEventListener('change',function(){importImageFile(ui.importFile.files&&ui.importFile.files[0]);});
    ui.resize.addEventListener('click',function(){controller.resize(Number(ui.width.value)||32,Number(ui.height.value)||32);view.fitted=false;fitView();scheduleSyncToPrefab(false);});
    ui.undo.addEventListener('click',function(){controller.undo();scheduleSyncToPrefab(false);});ui.redo.addEventListener('click',function(){controller.redo();scheduleSyncToPrefab(false);});ui.center.addEventListener('click',fitView);
    ui.primary.addEventListener('input',applyColorsFromUi);ui.secondary.addEventListener('input',applyColorsFromUi);ui.alpha.addEventListener('input',applyColorsFromUi);ui.swapColors.addEventListener('click',function(){var a=ui.primary.value;ui.primary.value=ui.secondary.value;ui.secondary.value=a;applyColorsFromUi();});
    ui.facingGrid.addEventListener('click',function(e){var card=e.target.closest('.facingCard');if(!card)return;controller.setActiveFacing(Number(card.dataset.facing)||0);scheduleSyncToPrefab(true);});
    ui.copyFacing.addEventListener('click',function(){controller.copyFacingTo(Number(ui.copyFacingTarget.value)||0);scheduleSyncToPrefab(false);});
    ui.addLayer.addEventListener('click',function(){controller.addLayer();});ui.duplicateLayer.addEventListener('click',function(){controller.duplicateLayer();});ui.deleteLayer.addEventListener('click',function(){controller.removeLayer();});ui.layerUp.addEventListener('click',function(){controller.moveLayer(1);});ui.layerDown.addEventListener('click',function(){controller.moveLayer(-1);});
    ui.layerName.addEventListener('change',function(){controller.renameLayer(ui.layerName.value);});ui.layerOpacity.addEventListener('input',function(){ui.layerOpacityLabel.textContent=ui.layerOpacity.value+'%';});ui.layerOpacity.addEventListener('change',function(){var layer=controller.getActiveLayer();if(layer)controller.setLayerOpacity(layer.id,Number(ui.layerOpacity.value)/100);});
    ui.canvas.addEventListener('contextmenu',function(e){e.preventDefault();});ui.canvas.addEventListener('pointerdown',onPointerDown);ui.canvas.addEventListener('pointermove',onPointerMove);ui.canvas.addEventListener('pointerup',finishPointer);ui.canvas.addEventListener('pointercancel',finishPointer);ui.canvas.addEventListener('wheel',onWheel,{passive:false});
    ui.openProject.addEventListener('click',function(){ui.projectFile.click();});ui.projectFile.addEventListener('change',function(){openProjectFile(ui.projectFile.files&&ui.projectFile.files[0]);});
    ui.exportMaterial.addEventListener('click',exportUnifiedMaterial);ui.importMaterial.addEventListener('click',function(){ui.materialFile.click();});ui.materialFile.addEventListener('change',function(){importMaterialFile(ui.materialFile.files&&ui.materialFile.files[0]);});
    if(ui.leftToggle)ui.leftToggle.addEventListener('click',function(){cycleDock('left');});if(ui.rightToggle)ui.rightToggle.addEventListener('click',function(){cycleDock('right');});if(ui.restoreLeft)ui.restoreLeft.addEventListener('click',function(){setDockState('left','expanded');});if(ui.restoreRight)ui.restoreRight.addEventListener('click',function(){setDockState('right','expanded');});if(ui.focus)ui.focus.addEventListener('click',function(){toggleFocusMode();});
    document.querySelectorAll('[data-inspector-tab]').forEach(function(button){button.addEventListener('click',function(){setInspectorTab(button.dataset.inspectorTab);if(ui.shell.getAttribute('data-right-dock')==='compact')setDockState('right','expanded');});});
    if(ui.gridToggle)ui.gridToggle.addEventListener('click',function(){setDisplayOption('grid',!display.grid);});if(ui.originToggle)ui.originToggle.addEventListener('click',function(){setDisplayOption('origin',!display.origin);});if(ui.propertyGrid)ui.propertyGrid.addEventListener('change',function(){setDisplayOption('grid',ui.propertyGrid.checked);});if(ui.propertyOrigin)ui.propertyOrigin.addEventListener('change',function(){setDisplayOption('origin',ui.propertyOrigin.checked);});
    if(ui.stateAdd)ui.stateAdd.addEventListener('click',function(){var current=getDocument();var name=global.prompt('新状态名称','状态 '+materialStates.getBundle().states.length);if(name===null)return;materialStates.addState({name:(name||'').trim()||('状态 '+materialStates.getBundle().states.length),blankArtwork:true,voxel:captureVoxelSnapshot(),sprite:captureSpriteStateSnapshot(),metadata:{createdBy:'editor',createdAt:new Date().toISOString()}});});
    if(ui.stateDuplicate)ui.stateDuplicate.addEventListener('click',function(){var current=activeState();var name=global.prompt('复制后的状态名称',(current?current.name:'状态')+' 副本');if(name===null)return;materialStates.duplicateState((name||'').trim()||((current?current.name:'状态')+' 副本'));});
    if(ui.stateRename)ui.stateRename.addEventListener('click',function(){renameActiveMaterialState();});
    if(ui.stateDelete)ui.stateDelete.addEventListener('click',function(){var current=activeState();if(!current)return;if(materialStates.getBundle().states.length<=1){setStatus('至少保留一个状态',false);return;}if(global.confirm('删除状态“'+current.name+'”？'))materialStates.deleteState(current.id);});
    if(ui.stateMoveLeft)ui.stateMoveLeft.addEventListener('click',function(){materialStates.moveState(-1);});
    if(ui.stateMoveRight)ui.stateMoveRight.addEventListener('click',function(){materialStates.moveState(1);});
    if(ui.stateCopyLayer)ui.stateCopyLayer.addEventListener('click',function(){var layer=controller.getActiveLayer();if(layer&&materialStates.copyActiveLayer(layer.id,getDocument().activeFacing))setStatus('已复制图层：'+layer.name);else setStatus('没有可复制的图层',false);});
    if(ui.statePasteLayer)ui.statePasteLayer.addEventListener('click',function(){var target=ui.stateTarget&&ui.stateTarget.value;var facing=Number(ui.stateTargetFacing&&ui.stateTargetFacing.value)||0;if(materialStates.pasteLayer(target,facing))setStatus('图层已粘贴到目标状态');else setStatus('请先复制一个图层',false);});
    if(ui.stateCopyFacing)ui.stateCopyFacing.addEventListener('click',function(){var target=ui.stateTarget&&ui.stateTarget.value;var facing=Number(ui.stateTargetFacing&&ui.stateTargetFacing.value)||0;if(materialStates.copyFacingToState(target,facing,getDocument().activeFacing))setStatus('当前方向全部图层已复制到目标状态');});
    global.addEventListener('keydown',function(e){
      if(e.target&&['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
      if(e.code==='Space'){spacePressed=true;e.preventDefault();return;}
      if(e.key==='Tab'){e.preventDefault();toggleFocusMode();return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();if(e.shiftKey)controller.redo();else controller.undo();scheduleSyncToPrefab(false);return;}
      if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();controller.redo();scheduleSyncToPrefab(false);return;}
      var map={b:'pencil',e:'eraser',g:'fill',i:'picker',l:'line',r:'rect',m:'move'};if(map[e.key.toLowerCase()]){setTool(map[e.key.toLowerCase()]);e.preventDefault();return;}
      if(['0','1','2','3'].includes(e.key)){controller.setActiveFacing(Number(e.key));scheduleSyncToPrefab(true);e.preventDefault();}
    });
    global.addEventListener('keyup',function(e){if(e.code==='Space')spacePressed=false;});
    global.addEventListener('unified-asset-editor:step-changed',function(e){setBodyStep(e.detail&&e.detail.step);});
    global.addEventListener('resize',resizeCanvas);
    if(typeof ResizeObserver==='function')new ResizeObserver(resizeCanvas).observe(ui.viewport);
  }

  function initialize() {
    editorApi=getEditorApi();
    var existing=editorApi&&typeof editorApi.getArtworkDocument==='function'?editorApi.getArtworkDocument():null;
    if(existing&&Array.isArray(existing.facings))controller.setSerializedDocument(existing,'existing-prefab');
    else getDocument().metadata.registrationPx={x:getDocument().width/2,y:getDocument().height};
    var existingStateBundle=editorApi&&typeof editorApi.getMaterialStateBundle==='function'?editorApi.getMaterialStateBundle():null;
    initializeMaterialStates(existingStateBundle||materialStateCore.createBundle(materialStateInitialPayload()),'editor-initialize');
    controller.subscribe(function(event){updateAll();if(!materialStates||!materialStates.isApplying()){if(event.type==='change'||event.type==='document-replaced'||event.type==='document-restored')scheduleSyncToPrefab(false);}});
    bindUi();restoreDockPreferences();
    var initialTab='layers';try{initialTab=localStorage.getItem('hzhPixelEditor.inspectorTab')||'layers';}catch(_){ }setInspectorTab(initialTab);
    setDisplayOption('grid',true);setDisplayOption('origin',true);applyColorsFromUi();setTool('pencil');setBodyStep('image');resizeCanvas();fitView();updateAll();
    if(editorApi&&typeof editorApi.registerBeforeExportHook==='function')editorApi.registerBeforeExportHook(function(){syncToPrefab();if(materialStates){var bundle=materialStates.exportBundle();attachBundleToPrefab(bundle);}});
    function setActiveFacingExternal(index, options) {
      options = options || {};
      var facing = Math.max(0, Math.min(3, Math.round(Number(index) || 0)));
      controller.setActiveFacing(facing);
      if (options.sync !== false) syncToPrefab();
      try {
        if (options.emit !== false) global.dispatchEvent(new CustomEvent('unified-asset-editor:facing-changed', { detail: { facing: facing, source: options.source || 'pixel-editor-api' } }));
      } catch (_) {}
      return facing;
    }
    global.__HZH_PIXEL_ART_EDITOR__={version:VERSION,controller:controller,materialStates:materialStates,render:render,exportMaterial:exportUnifiedMaterial,syncToPrefab:syncToPrefab,fitView:fitView,setTool:setTool,setActiveFacing:setActiveFacingExternal,getActiveFacing:function(){return getDocument().activeFacing;},getFacingName:function(index){var d=getDocument(),f=d.facings[Math.max(0,Math.min(3,Math.round(Number(index)||0)))];return f?f.name:'方向 '+index;},getMaterialStateBundle:function(){return materialStates?materialStates.exportBundle():null;},replaceMaterialStates:function(states,activeStateId,reason){return materialStates.replaceStates(states,activeStateId,reason||'external-replace');},restoreMaterialStatesFromPackage:restoreMaterialStatesFromPackage};
    if(global.__APP_NAMESPACE&&typeof global.__APP_NAMESPACE.bind==='function')global.__APP_NAMESPACE.bind('presentation.pixelArtEditor',global.__HZH_PIXEL_ART_EDITOR__,{owner:'src/presentation/editor/pixel-art-editor.js',phase:'asset-editor-v3'});
    setStatus('图片编辑器已就绪');
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});else initialize();
})(typeof window!=='undefined'?window:globalThis);
