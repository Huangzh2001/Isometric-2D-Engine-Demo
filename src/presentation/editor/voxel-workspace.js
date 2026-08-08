(function (global) {
  'use strict';

  var VERSION = '20260807-facing-image-source-mirror-v6';
  function byId(id) { return document.getElementById(id); }
  function editorApi() { return global.App && global.App.editor && global.App.editor.unifiedV18; }
  function dispatchInput(element) {
    if (!element) return;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function readDock(key, fallback) {
    try { return localStorage.getItem(key) || fallback; } catch (_) { return fallback; }
  }
  function writeDock(key, value) {
    try { localStorage.setItem(key, value); } catch (_) {}
  }
  function nextDock(value) {
    return value === 'expanded' ? 'compact' : value === 'compact' ? 'hidden' : 'expanded';
  }

  var ui = {
    workspace: byId('voxelWorkspace'),
    shell: byId('voxelWorkspaceShell'),
    leftToggle: byId('voxelToggleLeftDock'),
    rightToggle: byId('voxelToggleRightDock'),
    restoreLeft: byId('voxelRestoreLeftDock'),
    restoreRight: byId('voxelRestoreRightDock'),
    editMode: byId('voxelEditMode'),
    alignMode: byId('voxelAlignImageMode'),
    showImage: byId('voxelShowImageToggle'),
    inspectorShowImage: byId('voxelInspectorShowImage'),
    fitView: byId('voxelFitView'),
    previewScale: byId('previewScale'),
    renderMode: byId('renderMode'),
    split: byId('voxelSplitHandle'),
    dual: byId('voxelDualViewport'),
    hint: byId('voxelInteractionHint'),
    voxelCountInline: byId('voxelCountInline'),
    saveArtworkSummary: byId('saveArtworkSummary'),
    saveAlignmentSummary: byId('saveAlignmentSummary'),
    spriteImageNameDisplay: byId('spriteImageNameDisplay'),
    spriteImageName: byId('spriteImageName'),
    facingControl: byId('voxelFacingControl'),
    facingStatus: byId('voxelFacingStatus'),
    facingInline: byId('voxelFacingInline'),
    facingInspectorSummary: byId('voxelFacingInspectorSummary'),
    topdownFacingHint: byId('voxelTopdownFacingHint'),
    previewFacingHint: byId('voxelPreviewFacingHint'),
    spriteFacingTransformHint: byId('spriteFacingTransformHint')
  };

  function setDock(side, value) {
    if (!ui.shell) return;
    var attr = side === 'left' ? 'data-left-dock' : 'data-right-dock';
    ui.shell.setAttribute(attr, value);
    writeDock('hzhVoxelEditor.' + side + 'Dock', value);
    requestCanvasRefresh();
  }
  function requestCanvasRefresh() {
    var api = editorApi();
    requestAnimationFrame(function () {
      if (api && typeof api.requestRender === 'function') api.requestRender();
    });
  }
  function setInspectorTab(tab) {
    document.querySelectorAll('[data-voxel-tab]').forEach(function (button) {
      var active = button.getAttribute('data-voxel-tab') === tab;
      button.classList.toggle('activeInspectorTab', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-voxel-panel]').forEach(function (panel) {
      panel.classList.toggle('activeVoxelInspectorPanel', panel.getAttribute('data-voxel-panel') === tab);
    });
    try { localStorage.setItem('hzhVoxelEditor.inspectorTab', tab); } catch (_) {}
  }

  function setMode(mode, reason) {
    var api = editorApi();
    if (!api || typeof api.setInteractionMode !== 'function') return;
    var next = mode === 'align' ? 'sprite' : 'voxel';
    if (next === 'sprite' && typeof api.getSpriteTransform === 'function') {
      var sprite = api.getSpriteTransform();
      if (!sprite || !sprite.hasImage) {
        if (typeof api.setStatus === 'function') api.setStatus('当前素材没有图片。请先在“编辑图片”中导入或绘制图片。', false);
        return;
      }
    }
    if (next === 'sprite' && ui.renderMode && ui.renderMode.value === 'voxel') {
      ui.renderMode.value = 'sprite_proxy';
      dispatchInput(ui.renderMode);
    }
    api.setInteractionMode(next, reason || 'voxel-workspace');
    syncMode(next);
  }
  function syncMode(mode) {
    var alignment = mode === 'sprite';
    if (ui.editMode) ui.editMode.classList.toggle('activeMode', !alignment);
    if (ui.alignMode) ui.alignMode.classList.toggle('activeMode', alignment);
    if (ui.workspace) ui.workspace.classList.toggle('imageAlignmentMode', alignment);
    if (ui.hint) ui.hint.textContent = alignment
      ? '图片对齐模式：直接拖动图片改变位置；拖动图片右下角手柄缩放。按 A 可切回体素编辑。'
      : '体素编辑模式：左侧俯视层精修，右侧等距视图建立选区。按 A 可进入图片对齐。';
    if (alignment) setInspectorTab('alignment');
  }

  function setImageVisible(visible) {
    if (!ui.renderMode) return;
    ui.renderMode.value = visible ? 'sprite_proxy' : 'voxel';
    dispatchInput(ui.renderMode);
    if (ui.showImage) ui.showImage.classList.toggle('toggled', visible);
    if (ui.inspectorShowImage) ui.inspectorShowImage.checked = visible;
  }
  function currentImageVisible() { return !!ui.renderMode && ui.renderMode.value !== 'voxel'; }

  var FACING_LABELS = ['北', '东', '南', '西'];
  function normalizeFacing(value) { return Math.max(0, Math.min(3, Math.round(Number(value) || 0))); }
  function getFacing() {
    var api = editorApi();
    return api && typeof api.getVoxelViewFacing === 'function' ? normalizeFacing(api.getVoxelViewFacing()) : 0;
  }
  function syncFacingUi(facing) {
    facing = normalizeFacing(facing);
    document.querySelectorAll('[data-voxel-facing]').forEach(function (button) {
      var active = normalizeFacing(button.getAttribute('data-voxel-facing')) === facing;
      button.classList.toggle('activeVoxelFacing', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    var label = FACING_LABELS[facing];
    if (ui.facingStatus) ui.facingStatus.textContent = label + ' · 方向 ' + facing;
    if (ui.facingInline) ui.facingInline.textContent = '方向：' + label;
    if (ui.topdownFacingHint) ui.topdownFacingHint.textContent = label + '向俯视 · 网格与逻辑坐标同步旋转';
    if (ui.previewFacingHint) ui.previewFacingHint.textContent = label + '向图片、锚点与同一份碰撞体共同显示';
    var api = editorApi();
    var transform = api && typeof api.getSpriteTransform === 'function' ? api.getSpriteTransform() : null;
    var sourceFacing = transform && transform.sourceFacing != null ? normalizeFacing(transform.sourceFacing) : facing;
    var mirrorText = '';
    if (transform && transform.flipX) mirrorText += ' · 水平镜像';
    if (transform && transform.flipY) mirrorText += ' · 垂直镜像';
    if (ui.facingInspectorSummary) ui.facingInspectorSummary.textContent = '当前：' + label + ' · 使用' + FACING_LABELS[sourceFacing] + '方向图片' + mirrorText + ' · 此方向参数独立保存';
    if (ui.spriteFacingTransformHint) ui.spriteFacingTransformHint.textContent = label + '方向 ← ' + FACING_LABELS[sourceFacing] + '方向图片' + mirrorText;
  }
  function setFacing(facing, reason) {
    facing = normalizeFacing(facing);
    var api = editorApi();
    if (api && typeof api.setVoxelViewFacing === 'function') api.setVoxelViewFacing(facing, reason || 'voxel-toolbar');
    var pixel = global.__HZH_PIXEL_ART_EDITOR__;
    if (pixel && typeof pixel.setActiveFacing === 'function') pixel.setActiveFacing(facing, { sync: false, emit: false, source: 'voxel-toolbar' });
    syncFacingUi(facing);
    requestCanvasRefresh();
    return facing;
  }

  function updateReview() {
    var api = editorApi();
    if (!api || typeof api.getPrefabDraft !== 'function') return;
    var draft;
    try { draft = api.getPrefabDraft(); } catch (_) { return; }
    var voxels = Array.isArray(draft && draft.voxels) ? draft.voxels : [];
    var artwork = draft && draft.artwork;
    var facings = artwork && Array.isArray(artwork.facings) ? artwork.facings : [];
    var layerCount = facings.reduce(function (sum, facing) {
      return sum + (facing && Array.isArray(facing.layers) ? facing.layers.length : 0);
    }, 0);
    var sprite = draft && draft.sprite;
    if (ui.voxelCountInline) ui.voxelCountInline.textContent = '体素：' + voxels.length;
    if (ui.saveArtworkSummary) ui.saveArtworkSummary.textContent = facings.length + ' 个方向 · ' + layerCount + ' 个图层 · ' + ((artwork && artwork.width) || 0) + ' × ' + ((artwork && artwork.height) || 0) + ' px';
    if (ui.saveAlignmentSummary) {
      var transformCount = sprite && Array.isArray(sprite.facingTransforms) ? sprite.facingTransforms.filter(Boolean).length : 0;
      ui.saveAlignmentSummary.textContent = sprite
        ? '当前方向偏移 ' + Math.round((sprite.offsetPx && sprite.offsetPx.x) || 0) + ', ' + Math.round((sprite.offsetPx && sprite.offsetPx.y) || 0) + ' · 缩放 ' + Number(sprite.scale || 1).toFixed(2) + ' · 图片源 ' + FACING_LABELS[normalizeFacing(sprite.sourceFacing == null ? sprite.activeFacing : sprite.sourceFacing)] + (sprite.flipX ? ' · 水平镜像' : '') + (sprite.flipY ? ' · 垂直镜像' : '') + ' · 已保存 ' + transformCount + '/4 方向'
        : '当前素材没有图片代理';
    }
    if (ui.spriteImageNameDisplay) ui.spriteImageNameDisplay.textContent = sprite && sprite.fileName ? sprite.fileName : '当前合成图片';
    if (ui.spriteImageName && sprite && sprite.fileName && ui.spriteImageName.value !== sprite.fileName) ui.spriteImageName.value = sprite.fileName;
  }

  function bindSplitter() {
    if (!ui.split || !ui.dual || !ui.shell) return;
    var dragging = false;
    function apply(clientX) {
      var rect = ui.dual.getBoundingClientRect();
      if (!rect.width) return;
      var pct = Math.max(27, Math.min(65, ((clientX - rect.left) / rect.width) * 100));
      ui.shell.style.setProperty('--voxel-grid-ratio', pct.toFixed(2) + '%');
      try { localStorage.setItem('hzhVoxelEditor.splitRatio', String(pct)); } catch (_) {}
      requestCanvasRefresh();
    }
    ui.split.addEventListener('pointerdown', function (event) {
      dragging = true;
      ui.split.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    ui.split.addEventListener('pointermove', function (event) { if (dragging) apply(event.clientX); });
    ui.split.addEventListener('pointerup', function (event) {
      dragging = false;
      try { ui.split.releasePointerCapture(event.pointerId); } catch (_) {}
    });
    try {
      var saved = Number(localStorage.getItem('hzhVoxelEditor.splitRatio'));
      if (saved >= 27 && saved <= 65) ui.shell.style.setProperty('--voxel-grid-ratio', saved + '%');
    } catch (_) {}
  }

  function bind() {
    if (!ui.workspace || !ui.shell) return;
    setDock('left', readDock('hzhVoxelEditor.leftDock', 'expanded'));
    setDock('right', readDock('hzhVoxelEditor.rightDock', 'expanded'));
    var tab = 'shape';
    try { tab = localStorage.getItem('hzhVoxelEditor.inspectorTab') || 'shape'; } catch (_) {}
    setInspectorTab(tab);

    if (ui.leftToggle) ui.leftToggle.addEventListener('click', function () { setDock('left', nextDock(ui.shell.getAttribute('data-left-dock') || 'expanded')); });
    if (ui.rightToggle) ui.rightToggle.addEventListener('click', function () { setDock('right', nextDock(ui.shell.getAttribute('data-right-dock') || 'expanded')); });
    if (ui.restoreLeft) ui.restoreLeft.addEventListener('click', function () { setDock('left', 'expanded'); });
    if (ui.restoreRight) ui.restoreRight.addEventListener('click', function () { setDock('right', 'expanded'); });
    document.querySelectorAll('[data-voxel-tab]').forEach(function (button) {
      button.addEventListener('click', function () {
        setInspectorTab(button.getAttribute('data-voxel-tab'));
        if (ui.shell.getAttribute('data-right-dock') === 'compact') setDock('right', 'expanded');
      });
    });
    document.querySelectorAll('[data-voxel-facing]').forEach(function (button) {
      button.addEventListener('click', function () { setFacing(button.getAttribute('data-voxel-facing'), 'voxel-facing-button'); });
    });
    if (ui.editMode) ui.editMode.addEventListener('click', function () { setMode('voxel', 'voxel-toolbar'); });
    if (ui.alignMode) ui.alignMode.addEventListener('click', function () { setMode('align', 'voxel-toolbar'); });
    if (ui.showImage) ui.showImage.addEventListener('click', function () { setImageVisible(!currentImageVisible()); });
    if (ui.inspectorShowImage) ui.inspectorShowImage.addEventListener('change', function () { setImageVisible(ui.inspectorShowImage.checked); });
    if (ui.fitView) ui.fitView.addEventListener('click', function () {
      if (ui.previewScale) { ui.previewScale.value = '1'; dispatchInput(ui.previewScale); }
      requestCanvasRefresh();
    });
    bindSplitter();

    global.addEventListener('unified-asset-editor:interaction-mode-changed', function (event) { syncMode(event.detail && event.detail.mode); });
    global.addEventListener('unified-asset-editor:step-changed', function (event) {
      var step = event.detail && event.detail.step;
      if (step === 'voxel') {
        var api = editorApi();
        var mode = api && typeof api.getInteractionMode === 'function' ? api.getInteractionMode() : 'voxel';
        syncMode(mode);
        syncFacingUi(getFacing());
        if (mode !== 'sprite') setInspectorTab('shape');
        requestCanvasRefresh();
      }
      if (step === 'save' || step === 'voxel') updateReview();
    });
    global.addEventListener('unified-asset-editor:source-changed', updateReview);
    global.addEventListener('unified-asset-editor:facing-changed', function (event) {
      syncFacingUi(event && event.detail ? event.detail.facing : getFacing());
      requestCanvasRefresh();
    });
    document.addEventListener('input', function () { if (document.body.dataset.editorStep !== 'image') requestAnimationFrame(updateReview); });
    document.addEventListener('click', function () { if (document.body.dataset.editorStep !== 'image') requestAnimationFrame(updateReview); });
    global.addEventListener('keydown', function (event) {
      if (document.body.dataset.editorStep !== 'voxel') return;
      if (event.target && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.altKey && ['0','1','2','3'].includes(event.key)) {
        setFacing(Number(event.key), 'keyboard-alt-facing');
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === 'a') {
        var api = editorApi();
        var mode = api && typeof api.getInteractionMode === 'function' ? api.getInteractionMode() : 'voxel';
        setMode(mode === 'sprite' ? 'voxel' : 'align', 'keyboard-a');
        event.preventDefault();
      }
    });

    var api = editorApi();
    syncMode(api && typeof api.getInteractionMode === 'function' ? api.getInteractionMode() : 'voxel');
    syncFacingUi(getFacing());
    setImageVisible(currentImageVisible());
    updateReview();
    global.__HZH_VOXEL_WORKSPACE__ = { version: VERSION, setMode: setMode, setDock: setDock, setFacing: setFacing, getFacing: getFacing, updateReview: updateReview };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})(typeof window !== 'undefined' ? window : globalThis);
