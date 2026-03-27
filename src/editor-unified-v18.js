(function () {
  'use strict';

  const BUILD_VERSION = '20260320-v18-box-occlusion';
  const STORAGE_KEY = 'isometric-room-prefabs-v1';
  const MAX_LOGS = 600;
  const PREVIEW_LOG_LIMIT = 120;
  const EDITOR_VERBOSE_LOG = false;

  try {
    document.documentElement.setAttribute('data-editor-build', BUILD_VERSION);
  } catch {}

  const gridCanvas = document.getElementById('gridCanvas');
  const gridCtx = gridCanvas.getContext('2d');
  const previewCanvas = document.getElementById('previewCanvas');
  const previewCtx = previewCanvas.getContext('2d');

  const ui = {
    prefabId: document.getElementById('prefabId'),
    prefabName: document.getElementById('prefabName'),
    prefabKind: document.getElementById('prefabKind'),
    prefabAsset: document.getElementById('prefabAsset'),
    prefabBase: document.getElementById('prefabBase'),
    renderMode: document.getElementById('renderMode'),
    importSpriteImage: document.getElementById('importSpriteImage'),
    clearSpriteImage: document.getElementById('clearSpriteImage'),
    spriteImageFile: document.getElementById('spriteImageFile'),
    spriteImageName: document.getElementById('spriteImageName'),
    spriteScale: document.getElementById('spriteScale'),
    spriteOffsetX: document.getElementById('spriteOffsetX'),
    spriteOffsetY: document.getElementById('spriteOffsetY'),
    spriteThumb: document.getElementById('spriteThumb'),
    spriteThumbPlaceholder: document.getElementById('spriteThumbPlaceholder'),
    interactionModeSummary: document.getElementById('interactionModeSummary'),
    spritePreviewOpacity: document.getElementById('spritePreviewOpacity'),
    spritePreviewOpacityNumber: document.getElementById('spritePreviewOpacityNumber'),
    spritePreviewOpacityValue: document.getElementById('spritePreviewOpacityValue'),
    footprintCols: document.getElementById('footprintCols'),
    footprintRows: document.getElementById('footprintRows'),
    spriteSampleBand: document.getElementById('spriteSampleBand'),
    spriteFitMode: document.getElementById('spriteFitMode'),
    spriteSampleYPercent: document.getElementById('spriteSampleYPercent'),
    footprintAnchorReadX: document.getElementById('footprintAnchorReadX'),
    footprintAnchorReadY: document.getElementById('footprintAnchorReadY'),
    swapFootprint: document.getElementById('swapFootprint'),
    applySelectionFootprint: document.getElementById('applySelectionFootprint'),
    autoFitSpriteFootprint: document.getElementById('autoFitSpriteFootprint'),
    pickSpriteSampleLine: document.getElementById('pickSpriteSampleLine'),
    toggleSpriteFitGuides: document.getElementById('toggleSpriteFitGuides'),
    toggleSpriteLockX: document.getElementById('toggleSpriteLockX'),
    spriteFitSummary: document.getElementById('spriteFitSummary'),
    anchorX: document.getElementById('anchorX'),
    anchorY: document.getElementById('anchorY'),
    anchorZ: document.getElementById('anchorZ'),
    currentLayer: document.getElementById('currentLayer'),
    editorGridW: document.getElementById('editorGridW'),
    editorGridH: document.getElementById('editorGridH'),
    previewScale: document.getElementById('previewScale'),
    layerDown: document.getElementById('layerDown'),
    layerUp: document.getElementById('layerUp'),
    clearLayer: document.getElementById('clearLayer'),
    toolPaint: document.getElementById('toolPaint'),
    toolErase: document.getElementById('toolErase'),
    toolRect: document.getElementById('toolRect'),
    toolVolume: document.getElementById('toolVolume'),
    toolStatusLine: document.getElementById('toolStatusLine'),
    selectionSummary: document.getElementById('selectionSummary'),
    applyFillSelection: document.getElementById('modeBuild'),
    applyDeleteSelection: document.getElementById('modeFocus'),
    clearSelection: document.getElementById('clearSelection'),
    modeSummary: document.getElementById('modeSummary'),
    newPrefab: document.getElementById('newPrefab'),
    clearAll: document.getElementById('clearAll'),
    loadSampleStair: document.getElementById('loadSampleStair'),
    loadSampleT: document.getElementById('loadSampleT'),
    saveLibrary: document.getElementById('saveLibrary'),
    downloadJson: document.getElementById('downloadJson'),
    importJson: document.getElementById('importJson'),
    importFile: document.getElementById('importFile'),
    openMain: document.getElementById('openMain'),
    exportEditorLogs: document.getElementById('exportEditorLogs'),
    clearEditorLogs: document.getElementById('clearEditorLogs'),
    logPreview: document.getElementById('editorLogPreview'),
    jsonPreview: document.getElementById('jsonPreview'),
    status: document.getElementById('editorStatus'),
    gridSummary: document.getElementById('gridSummary'),
    previewSummary: document.getElementById('previewSummary'),
    voxelCountText: document.getElementById('voxelCountText'),
    editorStepImage: document.getElementById('editorStepImage'),
    editorStepVoxel: document.getElementById('editorStepVoxel'),
    editorStepSave: document.getElementById('editorStepSave'),
    editorPageImage: document.getElementById('editorPageImage'),
    editorPageVoxel: document.getElementById('editorPageVoxel'),
    editorPageSave: document.getElementById('editorPageSave'),
  };

  const samples = {
    stair: {
      id: 'stair_3step_custom',
      name: 'Stair 3 Step',
      kind: 'stair',
      asset: '',
      base: '#c99568',
      anchor: { x: 0, y: 0, z: 0 },
      voxels: [
        { x: 0, y: 0, z: 0, solid: true, collidable: true },
        { x: 1, y: 0, z: 0, solid: true, collidable: true }, { x: 1, y: 0, z: 1, solid: true, collidable: true },
        { x: 2, y: 0, z: 0, solid: true, collidable: true }, { x: 2, y: 0, z: 1, solid: true, collidable: true }, { x: 2, y: 0, z: 2, solid: true, collidable: true },
      ],
    },
    tshape: {
      id: 't_shape_custom',
      name: 'T Shape',
      kind: 'shape',
      asset: '',
      base: '#7fbf9a',
      anchor: { x: 0, y: 0, z: 0 },
      voxels: [
        { x: 0, y: 0, z: 0, solid: true, collidable: true },
        { x: 1, y: 0, z: 0, solid: true, collidable: true },
        { x: 2, y: 0, z: 0, solid: true, collidable: true },
        { x: 1, y: 1, z: 0, solid: true, collidable: true },
      ],
    },
  };

  function makeUniqueSeed() {
    return Date.now().toString(36).slice(-6);
  }
  function defaultPrefabIdentity() {
    const seed = makeUniqueSeed();
    return { id: `custom_prefab_${seed}`, name: `Custom Prefab ${seed.toUpperCase()}` };
  }

  const initialIdentity = defaultPrefabIdentity();
  const state = {
    id: initialIdentity.id,
    name: initialIdentity.name,
    kind: 'custom',
    asset: '',
    base: '#c7b0df',
    renderMode: 'voxel',
    interactionMode: 'sprite',
    sprite: { image: '', imageExport: '', objectUrl: '', fileName: '', scale: 1, offsetX: 0, offsetY: 0, previewOpacity: 1 },
    spriteFit: { footprintCols: 1, footprintRows: 1, detectionMode: 'full', sampleYNormalized: 1, sampleBandPx: 1, guidesVisible: true, lockHorizontal: true, pickSampleActive: false },
    anchor: { x: 0, y: 0, z: 0 },
    gridW: 10,
    gridH: 10,
    currentLayer: 0,
    previewScale: 1,
    voxels: new Map(),
    tool: 'single', // single | rect | box
    hoverCell: null,
    previewPointer: null,
    selection: {
      kind: 'none',
      cells: [],
      start: null,
      end: null,
      height: 1,
      stage: 'idle', // idle | rect-start | box-base | box-height
      anchorClientY: 0,
    },
    _gridMetrics: null,
    _previewMetrics: null,
    _spriteScreenRect: null,
    spriteDrag: { active: false, startClientX: 0, startClientY: 0, startOffsetX: 0, startOffsetY: 0, pixelScale: 1 },
    spriteResize: { active: false, startClientX: 0, startClientY: 0, startScale: 1, startDrawW: 1, startDrawH: 1 },
    sidebarStep: 'image',
  };

  const editorLogs = [];
  let lastEvent = 'boot';
  let previewLogCount = 0;
  let lastHoverSignature = '';
  let logReady = false;
  let jsonPreviewTimer = 0;
  let jsonPreviewDirty = true;
  let lastJsonPreviewText = '';
  let spriteExportDataUrlPromise = null;

  let spriteAlphaProfileCache = { src: '', width: 0, height: 0, profile: null };

  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }
  function sanitizeFootprintValue(raw) {
    return Math.max(1, Math.min(64, Math.round(Number(raw) || 1)));
  }
  function sanitizeSampleBandPx(raw) {
    return Math.max(1, Math.min(128, Math.round(Number(raw) || 1)));
  }
  function sanitizeSampleYPercent(raw) {
    return clampNumber(Number(raw) || 0, 0, 100);
  }
  function getSpriteFitModeLabel(mode = state.spriteFit?.detectionMode) {
    return mode === 'sample-band' ? '鼠标指定高度' : '全图最左/最右';
  }
  function resetSpriteFitRuntime(options = {}) {
    const preserveGuides = options.preserveGuides !== false;
    const preserveLock = options.preserveLock !== false;
    const guidesVisible = preserveGuides && state.spriteFit ? !!state.spriteFit.guidesVisible : true;
    const lockHorizontal = preserveLock && state.spriteFit ? !!state.spriteFit.lockHorizontal : true;
    state.spriteFit = {
      footprintCols: 1,
      footprintRows: 1,
      detectionMode: 'full',
      sampleYNormalized: 1,
      sampleBandPx: 1,
      guidesVisible,
      lockHorizontal,
      pickSampleActive: false,
    };
  }


  function getSidebarStepTargets() {
    return [
      { step: 'image', button: ui.editorStepImage, page: ui.editorPageImage },
      { step: 'voxel', button: ui.editorStepVoxel, page: ui.editorPageVoxel },
      { step: 'save', button: ui.editorStepSave, page: ui.editorPageSave },
    ];
  }
  function applySidebarStepUi() {
    const activeStep = state.sidebarStep || 'image';
    for (const entry of getSidebarStepTargets()) {
      if (entry.button) entry.button.classList.toggle('activeStepTab', entry.step === activeStep);
      if (entry.page) entry.page.classList.toggle('isHiddenStep', entry.step !== activeStep);
    }
  }
  function setSidebarStep(step, reason = 'ui') {
    const nextStep = ['image', 'voxel', 'save'].includes(step) ? step : 'image';
    const previousStep = state.sidebarStep;
    state.sidebarStep = nextStep;
    applySidebarStepUi();
    if (nextStep === 'image') setInteractionMode('sprite', `step:${reason}`);
    else if (nextStep === 'voxel') setInteractionMode('voxel', `step:${reason}`);
    if (previousStep !== nextStep) detailEditorLog(`sidebar:step step=${nextStep} reason=${reason}`);
  }
  function bindSidebarStepTabs() {
    const mapping = [
      ['image', ui.editorStepImage],
      ['voxel', ui.editorStepVoxel],
      ['save', ui.editorStepSave],
    ];
    for (const [step, button] of mapping) {
      if (!button) continue;
      button.addEventListener('click', () => {
        lastEvent = `button:sidebarStep:${step}`;
        setSidebarStep(step, 'button');
      });
    }
    setSidebarStep(state.sidebarStep || 'image', 'init');
  }

  function revokeSpriteObjectUrl(url) {
    if (!url || !/^blob:/i.test(url)) return;
    try { URL.revokeObjectURL(url); } catch {}
  }
  function resetSpriteExportPromise() {
    spriteExportDataUrlPromise = null;
  }
  function hasSpriteImage() {
    return !!(state.sprite && (state.sprite.image || state.sprite.imageExport));
  }
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('read image failed'));
      reader.readAsDataURL(file);
    });
  }
  async function ensureSpriteExportImageReady() {
    if (!hasSpriteImage()) return '';
    if (state.sprite.imageExport) return state.sprite.imageExport;
    if (spriteExportDataUrlPromise) {
      try { return await spriteExportDataUrlPromise; }
      catch { return ''; }
    }
    return (!state.sprite.objectUrl && state.sprite.image) ? state.sprite.image : '';
  }
  async function createPrefabObjectForExport() {
    await ensureSpriteExportImageReady();
    return createPrefabObject({ includeSpriteImageData: true });
  }

  let editorSpriteImg = null;
  let editorSpriteImgSrc = '';
  let spriteRenderCache = { src: '', drawW: 0, drawH: 0, canvas: null };
  function ensureEditorSpriteImage(src) {
    if (!src) return null;
    if (editorSpriteImg && editorSpriteImgSrc === src) return editorSpriteImg;
    const img = new Image();
    img.onload = () => { detailEditorLog(`sprite:loaded size=${img.naturalWidth}x${img.naturalHeight}`); rerender(); updateSpriteThumb(); };
    img.onerror = () => { detailEditorLog('sprite:error failed to load'); if (ui.spriteThumbPlaceholder) ui.spriteThumbPlaceholder.textContent = '图片加载失败'; };
    img.src = src;
    editorSpriteImg = img;
    editorSpriteImgSrc = src;
    return img;
  }
  function clearEditorSpriteImageCache() {
    editorSpriteImg = null;
    editorSpriteImgSrc = '';
    spriteRenderCache = { src: '', drawW: 0, drawH: 0, canvas: null };
    spriteAlphaProfileCache = { src: '', width: 0, height: 0, profile: null };
  }
  function releaseCurrentSpriteObjectUrl() {
    revokeSpriteObjectUrl(state.sprite && state.sprite.objectUrl);
    if (state.sprite) state.sprite.objectUrl = '';
    resetSpriteExportPromise();
  }
  function invalidateEditorSpriteRenderCache() {
    spriteRenderCache = { src: '', drawW: 0, drawH: 0, canvas: null };
  }
  function invalidateSpriteAlphaProfileCache() {
    spriteAlphaProfileCache = { src: '', width: 0, height: 0, profile: null };
  }
  function getCachedEditorSpriteCanvas(img, drawW, drawH) {
    if (!img || !drawW || !drawH) return null;
    if (spriteRenderCache.canvas && spriteRenderCache.src === editorSpriteImgSrc && spriteRenderCache.drawW === drawW && spriteRenderCache.drawH === drawH) return spriteRenderCache.canvas;
    const c = document.createElement('canvas');
    c.width = drawW; c.height = drawH;
    const cctx = c.getContext('2d', { alpha: true });
    cctx.imageSmoothingEnabled = true;
    cctx.clearRect(0,0,drawW,drawH);
    cctx.drawImage(img, 0, 0, drawW, drawH);
    spriteRenderCache = { src: editorSpriteImgSrc, drawW, drawH, canvas: c };
    detailEditorLog(`sprite:cache rebuild=${drawW}x${drawH}`);
    return c;
  }

  function buildSpriteAlphaProfile(img) {
    if (!img || !img.naturalWidth || !img.naturalHeight) return null;
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    const cctx = c.getContext('2d', { willReadFrequently: true, alpha: true });
    cctx.clearRect(0, 0, width, height);
    cctx.drawImage(img, 0, 0);
    const data = cctx.getImageData(0, 0, width, height).data;
    let fullLeft = Infinity;
    let fullRight = -1;
    let fullTop = Infinity;
    let fullBottom = -1;
    const rows = new Array(height);
    for (let y = 0; y < height; y++) {
      let rowLeft = Infinity;
      let rowRight = -1;
      let count = 0;
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const alpha = data[rowOffset + x * 4 + 3];
        if (alpha > 8) {
          if (rowLeft === Infinity) rowLeft = x;
          rowRight = x;
          count += 1;
        }
      }
      if (count > 0) {
        fullLeft = Math.min(fullLeft, rowLeft);
        fullRight = Math.max(fullRight, rowRight);
        fullTop = Math.min(fullTop, y);
        fullBottom = Math.max(fullBottom, y);
        rows[y] = { left: rowLeft, right: rowRight, count };
      } else {
        rows[y] = { left: -1, right: -1, count: 0 };
      }
    }
    const full = fullRight >= 0
      ? { left: fullLeft, right: fullRight, top: fullTop, bottom: fullBottom }
      : { left: 0, right: Math.max(0, width - 1), top: 0, bottom: Math.max(0, height - 1) };
    return { width, height, rows, full };
  }
  function getSpriteAlphaProfile() {
    const img = ensureEditorSpriteImage(state.sprite.image);
    if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) return null;
    if (spriteAlphaProfileCache.profile && spriteAlphaProfileCache.src === editorSpriteImgSrc && spriteAlphaProfileCache.width === img.naturalWidth && spriteAlphaProfileCache.height === img.naturalHeight) {
      return spriteAlphaProfileCache.profile;
    }
    const profile = buildSpriteAlphaProfile(img);
    spriteAlphaProfileCache = { src: editorSpriteImgSrc, width: img.naturalWidth, height: img.naturalHeight, profile };
    return profile;
  }
  function findNearestNonEmptyRow(profile, centerY) {
    if (!profile || !profile.rows) return null;
    for (let dist = 0; dist < profile.height; dist++) {
      const ys = dist === 0 ? [centerY] : [centerY - dist, centerY + dist];
      for (const y of ys) {
        if (y >= 0 && y < profile.height) {
          const row = profile.rows[y];
          if (row && row.count > 0) return { y, row };
        }
      }
    }
    return null;
  }
  function getSpriteSampleBounds(profile = getSpriteAlphaProfile()) {
    if (!profile) return null;
    if (state.spriteFit.detectionMode !== 'sample-band') {
      return { ...profile.full, mode: 'full', centerY: profile.full.bottom, sampleRows: [profile.full.bottom] };
    }
    const centerY = Math.round(clampNumber(state.spriteFit.sampleYNormalized, 0, 1) * Math.max(0, profile.height - 1));
    const band = sanitizeSampleBandPx(state.spriteFit.sampleBandPx);
    const radius = Math.max(0, Math.floor((band - 1) / 2));
    let left = Infinity;
    let right = -1;
    let top = Infinity;
    let bottom = -1;
    const sampleRows = [];
    for (let y = Math.max(0, centerY - radius); y <= Math.min(profile.height - 1, centerY + radius); y++) {
      const row = profile.rows[y];
      if (!row || row.count <= 0) continue;
      left = Math.min(left, row.left);
      right = Math.max(right, row.right);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      sampleRows.push(y);
    }
    if (right < 0) {
      const nearest = findNearestNonEmptyRow(profile, centerY);
      if (!nearest) return { ...profile.full, mode: 'full-fallback', centerY: profile.full.bottom, sampleRows: [profile.full.bottom] };
      left = nearest.row.left;
      right = nearest.row.right;
      top = nearest.y;
      bottom = nearest.y;
      sampleRows.push(nearest.y);
    }
    return { left, right, top, bottom, mode: 'sample-band', centerY, sampleRows };
  }
  function getSpriteFootprintGuide(m = state._previewMetrics) {
    if (!m) return null;
    const cols = sanitizeFootprintValue(state.spriteFit.footprintCols);
    const rows = sanitizeFootprintValue(state.spriteFit.footprintRows);
    const z = Number(state.anchor.z) || 0;
    const points = [];
    const polygons = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const poly = planeCellPolygon((Number(state.anchor.x) || 0) + x, (Number(state.anchor.y) || 0) + y, z, m.tileW, m.tileH, m.ox, m.oy);
        polygons.push(poly);
        for (const pt of poly) points.push(pt);
      }
    }
    if (!points.length) return null;
    const leftPoint = points.reduce((best, pt) => (!best || pt.x < best.x || (pt.x === best.x && pt.y < best.y)) ? pt : best, null);
    const rightPoint = points.reduce((best, pt) => (!best || pt.x > best.x || (pt.x === best.x && pt.y < best.y)) ? pt : best, null);
    const topY = points.reduce((best, pt) => Math.min(best, pt.y), points[0].y);
    const bottomY = points.reduce((best, pt) => Math.max(best, pt.y), points[0].y);
    const anchorScreen = iso(Number(state.anchor.x) || 0, Number(state.anchor.y) || 0, z, m.tileW, m.tileH, m.ox, m.oy);
    return { cols, rows, polygons, points, leftPoint, rightPoint, leftX: leftPoint.x, rightX: rightPoint.x, centerX: (leftPoint.x + rightPoint.x) / 2, topY, bottomY, anchorScreen, z };
  }
  function getSpriteGuideOverlay(m = state._previewMetrics) {
    const rect = getEditorSpriteDrawRect(m);
    const profile = getSpriteAlphaProfile();
    const bounds = getSpriteSampleBounds(profile);
    if (!rect || !profile || !bounds) return null;
    const drawScale = rect.scale;
    const imageLeftX = rect.x + bounds.left * drawScale;
    const imageRightX = rect.x + bounds.right * drawScale;
    const imageTopY = rect.y + bounds.top * drawScale;
    const imageBottomY = rect.y + (bounds.bottom + 1) * drawScale;
    const sampleCenterY = rect.y + bounds.centerY * drawScale;
    return {
      rect,
      profile,
      bounds,
      imageLeftX,
      imageRightX,
      imageTopY,
      imageBottomY,
      sampleCenterY,
      topY: rect.y - 28,
      bottomY: rect.bottom + 20,
    };
  }
  function updateSpriteFitUi() {
    if (ui.footprintCols) ui.footprintCols.value = String(sanitizeFootprintValue(state.spriteFit.footprintCols));
    if (ui.footprintRows) ui.footprintRows.value = String(sanitizeFootprintValue(state.spriteFit.footprintRows));
    if (ui.spriteSampleBand) ui.spriteSampleBand.value = String(sanitizeSampleBandPx(state.spriteFit.sampleBandPx));
    if (ui.spriteFitMode) ui.spriteFitMode.value = state.spriteFit.detectionMode === 'sample-band' ? 'sample-band' : 'full';
    if (ui.spriteSampleYPercent) ui.spriteSampleYPercent.value = String(Math.round(clampNumber(state.spriteFit.sampleYNormalized, 0, 1) * 100));
    if (ui.footprintAnchorReadX) ui.footprintAnchorReadX.value = String(Number(state.anchor.x) || 0);
    if (ui.footprintAnchorReadY) ui.footprintAnchorReadY.value = String(Number(state.anchor.y) || 0);
    if (ui.toggleSpriteFitGuides) {
      ui.toggleSpriteFitGuides.classList.toggle('activeToggle', !!state.spriteFit.guidesVisible);
      ui.toggleSpriteFitGuides.textContent = state.spriteFit.guidesVisible ? '辅助线：开' : '辅助线：关';
    }
    if (ui.toggleSpriteLockX) {
      ui.toggleSpriteLockX.classList.toggle('activeToggle', !!state.spriteFit.lockHorizontal);
      ui.toggleSpriteLockX.textContent = state.spriteFit.lockHorizontal ? '水平锁定：开' : '水平锁定：关';
    }
    if (ui.pickSpriteSampleLine) {
      ui.pickSpriteSampleLine.classList.toggle('activeToggle', !!state.spriteFit.pickSampleActive);
      ui.pickSpriteSampleLine.textContent = state.spriteFit.pickSampleActive ? '点击预览图取样中…' : '在预览图上点取参考高度';
    }
    if (ui.spriteFitSummary) {
      const sampleText = state.spriteFit.detectionMode === 'sample-band'
        ? `sampleY=${Math.round(clampNumber(state.spriteFit.sampleYNormalized, 0, 1) * 100)}% · band=${sanitizeSampleBandPx(state.spriteFit.sampleBandPx)}px`
        : 'sample=整图宽度';
      ui.spriteFitSummary.textContent = `自动占地：${sanitizeFootprintValue(state.spriteFit.footprintCols)}×${sanitizeFootprintValue(state.spriteFit.footprintRows)} · 检测=${getSpriteFitModeLabel()} · anchor=(${Number(state.anchor.x) || 0},${Number(state.anchor.y) || 0},${Number(state.anchor.z) || 0}) · ${sampleText}`;
    }
  }
  function setSpriteSampleFromPreviewClient(clientX, clientY, options = {}) {
    const hit = spriteHitFromClient(clientX, clientY);
    if (!hit) return false;
    const normalized = clampNumber((hit.localY - hit.y) / Math.max(1, hit.drawH), 0, 1);
    state.spriteFit.detectionMode = 'sample-band';
    state.spriteFit.sampleYNormalized = normalized;
    state.spriteFit.pickSampleActive = false;
    detailEditorLog(`sprite-fit:pick-sample normalized=${normalized.toFixed(4)}`);
    if (options.autoFit) applyAutoFitSpriteFootprint('pick-sample');
    syncStateToForm();
    return true;
  }
  function applySelectionFootprintFromCurrentSelection() {
    const bounds = selectionBounds(state.selection.cells);
    if (!bounds) {
      setStatus('当前没有选区，无法提取 m×n footprint', false);
      return false;
    }
    state.spriteFit.footprintCols = sanitizeFootprintValue(bounds.x1 - bounds.x0 + 1);
    state.spriteFit.footprintRows = sanitizeFootprintValue(bounds.y1 - bounds.y0 + 1);
    state.anchor.x = bounds.x0;
    state.anchor.y = bounds.y0;
    state.anchor.z = 0;
    state.spriteFit.pickSampleActive = false;
    syncStateToForm();
    setStatus(`已用当前选区设置占地 ${state.spriteFit.footprintCols}×${state.spriteFit.footprintRows}，并同步 anchor 到 (${state.anchor.x}, ${state.anchor.y}, 0)`);
    rerender();
    return true;
  }
  function applyAutoFitSpriteFootprint(reason = 'manual') {
    if (!hasSpriteImage()) {
      setStatus('请先导入 sprite 图片，再执行自动占地适配', false);
      return false;
    }
    const m = state._previewMetrics || computePreviewMetrics();
    const overlay = getSpriteGuideOverlay(m);
    const footprint = getSpriteFootprintGuide(m);
    if (!overlay || !footprint) {
      setStatus('当前无法计算自动占地：请确认图片已加载完成，并且 m×n footprint 合法', false);
      return false;
    }
    const naturalWidth = Math.max(1, overlay.bounds.right - overlay.bounds.left + 1);
    const targetWidth = Math.max(1, footprint.rightX - footprint.leftX);
    const unit = overlay.rect.pixelScale || (m.tileW / 64) || 1;
    const drawScale = targetWidth / naturalWidth;
    const nextScale = clampNumber(drawScale / Math.max(1e-6, unit), 0.1, 8);
    state.sprite.scale = nextScale;
    const boundaryCenterRelative = (((overlay.bounds.left + overlay.bounds.right) / 2) - (overlay.profile.width / 2)) * drawScale;
    const offsetXScaled = footprint.centerX - overlay.rect.anchor.x - boundaryCenterRelative;
    state.sprite.offsetX = Math.round(offsetXScaled / Math.max(1e-6, unit));
    invalidateEditorSpriteRenderCache();
    syncStateToForm();
    scheduleJsonPreviewUpdate(false);
    detailEditorLog(`sprite-fit:auto reason=${reason} footprint=${state.spriteFit.footprintCols}x${state.spriteFit.footprintRows} mode=${state.spriteFit.detectionMode} scale=${state.sprite.scale.toFixed(3)} offsetX=${state.sprite.offsetX}`);
    setStatus(`已自动适配占地 ${state.spriteFit.footprintCols}×${state.spriteFit.footprintRows}：以图片左右边界为检测源，按 footprint 宽度自动回算 scale=${state.sprite.scale.toFixed(2)}，offsetX=${state.sprite.offsetX}`);
    rerender();
    return true;
  }

  function updateSpriteThumb() {
    const has = !!state.sprite.image;
    if (ui.spriteThumb) {
      ui.spriteThumb.style.display = has ? 'block' : 'none';
      if (has) ui.spriteThumb.src = state.sprite.image;
    }
    if (ui.spriteThumbPlaceholder) ui.spriteThumbPlaceholder.style.display = has ? 'none' : 'block';
    if (ui.spriteThumbPlaceholder && !has) ui.spriteThumbPlaceholder.textContent = '未导入图片';
  }

  function pushEditorLog(message) {
    const line = `[${new Date().toISOString()}] ${message}`;
    editorLogs.push(line);
    while (editorLogs.length > MAX_LOGS) editorLogs.shift();
    if (ui.logPreview) ui.logPreview.value = editorLogs.slice(-PREVIEW_LOG_LIMIT).join('\n');
  }
  function detailEditorLog(message) { if (logReady && EDITOR_VERBOSE_LOG) pushEditorLog(message); }
  function getEditorEntryInfo() {
    const explicit = (typeof window !== 'undefined' && window.__APP_ENTRY_INFO && typeof window.__APP_ENTRY_INFO === 'object') ? window.__APP_ENTRY_INFO : null;
    const file = (() => { try { return String((location.pathname || '').split('/').pop() || 'unknown'); } catch { return 'unknown'; } })();
    return { kind: explicit?.kind || 'editor', label: explicit?.label || '编辑器', entryFile: explicit?.entryFile || file, launcherHint: explicit?.launcherHint || 'start_editor.bat', build: explicit?.build || BUILD_VERSION, href: (() => { try { return String(location.href || ''); } catch { return ''; } })() };
  }

  function safeTargetLabel(el) {
    if (!el) return 'null';
    try {
      const id = el.id ? `#${el.id}` : '';
      const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.') : '';
      return `${el.tagName || 'node'}${id}${cls}`;
    } catch { return 'unknown'; }
  }

  function setStatus(msg, ok = true) {
    ui.status.textContent = msg;
    ui.status.style.color = ok ? '#75c17d' : '#ff8e8e';
    detailEditorLog(`status ok=${ok} msg=${msg}`);
  }
  function clearEditorLogs() {
    editorLogs.length = 0;
    pushEditorLog(`editor-log-cleared build=${BUILD_VERSION}`);
  }

  function vkey(x, y, z) { return `${x},${y},${z}`; }
  function parseKey(key) {
    const [x, y, z] = String(key).split(',').map(Number);
    return { x, y, z };
  }
  function sortedVoxels() {
    return Array.from(state.voxels.entries())
      .map(([key, value]) => ({ ...parseKey(key), ...value }))
      .sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }
  function hasVoxel(x, y, z) { return state.voxels.has(vkey(x, y, z)); }
  function setVoxel(x, y, z) {
    const key = vkey(x, y, z);
    if (state.voxels.has(key)) {
      detailEditorLog(`voxel:add-skip exists=(${x},${y},${z})`);
      return false;
    }
    state.voxels.set(key, { solid: true, collidable: true });
    detailEditorLog(`voxel:add cell=(${x},${y},${z}) total=${state.voxels.size}`);
    return true;
  }
  function removeVoxel(x, y, z) {
    const key = vkey(x, y, z);
    const removed = state.voxels.delete(key);
    detailEditorLog(`voxel:remove cell=(${x},${y},${z}) removed=${removed} total=${state.voxels.size}`);
    return removed;
  }
  function withinGrid(x, y) { return x >= 0 && y >= 0 && x < state.gridW && y < state.gridH; }
  function ensureGridFit(maxX, maxY) {
    const prevW = state.gridW, prevH = state.gridH;
    state.gridW = Math.max(state.gridW, Math.min(64, maxX + 2));
    state.gridH = Math.max(state.gridH, Math.min(64, maxY + 2));
    if (state.gridW !== prevW || state.gridH !== prevH) detailEditorLog(`grid:expand from=${prevW}x${prevH} to=${state.gridW}x${state.gridH}`);
  }
  function countLayerVoxels(z) {
    let count = 0;
    for (const key of state.voxels.keys()) if (parseKey(key).z === z) count += 1;
    return count;
  }

  function syncFormToState() {
    state.id = (ui.prefabId.value || '').trim() || 'custom_prefab';
    state.name = (ui.prefabName.value || '').trim() || state.id;
    state.kind = (ui.prefabKind.value || '').trim() || 'custom';
    state.asset = (ui.prefabAsset.value || '').trim();
    state.base = ui.prefabBase.value || '#c7b0df';
    state.renderMode = ui.renderMode ? String(ui.renderMode.value || 'voxel') : 'voxel';
    state.sprite.fileName = (ui.spriteImageName.value || '').trim();
    state.sprite.scale = Math.max(0.1, Math.min(8, Number(ui.spriteScale.value) || 1));
    state.sprite.offsetX = Number(ui.spriteOffsetX.value) || 0;
    state.sprite.offsetY = Number(ui.spriteOffsetY.value) || 0;
    state.sprite.previewOpacity = Math.max(0.05, Math.min(1, Number(ui.spritePreviewOpacity && ui.spritePreviewOpacity.value) || (Number(ui.spritePreviewOpacityNumber && ui.spritePreviewOpacityNumber.value) / 100) || 1));
    state.spriteFit.footprintCols = sanitizeFootprintValue(ui.footprintCols && ui.footprintCols.value);
    state.spriteFit.footprintRows = sanitizeFootprintValue(ui.footprintRows && ui.footprintRows.value);
    state.spriteFit.sampleBandPx = sanitizeSampleBandPx(ui.spriteSampleBand && ui.spriteSampleBand.value);
    state.spriteFit.detectionMode = (ui.spriteFitMode && ui.spriteFitMode.value === 'sample-band') ? 'sample-band' : 'full';
    state.spriteFit.sampleYNormalized = sanitizeSampleYPercent(ui.spriteSampleYPercent && ui.spriteSampleYPercent.value) / 100;
    state.anchor.x = Number(ui.anchorX.value) || 0;
    state.anchor.y = Number(ui.anchorY.value) || 0;
    state.anchor.z = Number(ui.anchorZ.value) || 0;
    state.gridW = Math.max(4, Math.min(64, Number(ui.editorGridW.value) || 10));
    state.gridH = Math.max(4, Math.min(64, Number(ui.editorGridH.value) || 10));
    state.currentLayer = Math.max(0, Math.min(256, Number(ui.currentLayer.value) || 0));
    state.previewScale = Math.max(0.5, Math.min(2.5, Number(ui.previewScale.value) || 1));
  }
  function syncStateToForm() {
    ui.prefabId.value = state.id;
    ui.prefabName.value = state.name;
    ui.prefabKind.value = state.kind;
    ui.prefabAsset.value = state.asset;
    ui.prefabBase.value = state.base;
    if (ui.renderMode) ui.renderMode.value = state.renderMode || 'voxel';
    if (ui.spriteImageName) ui.spriteImageName.value = state.sprite.fileName || '';
    if (ui.spriteScale) ui.spriteScale.value = String(state.sprite.scale || 1);
    if (ui.spriteOffsetX) ui.spriteOffsetX.value = String(state.sprite.offsetX || 0);
    if (ui.spriteOffsetY) ui.spriteOffsetY.value = String(state.sprite.offsetY || 0);
    if (ui.spritePreviewOpacity) ui.spritePreviewOpacity.value = String(state.sprite.previewOpacity || 1);
    if (ui.spritePreviewOpacityNumber) ui.spritePreviewOpacityNumber.value = String(Math.round((state.sprite.previewOpacity || 1) * 100));
    if (ui.spritePreviewOpacityValue) ui.spritePreviewOpacityValue.textContent = `${Math.round((state.sprite.previewOpacity || 1) * 100)}%`;
    updateSpriteThumb();
    updateSpriteFitUi();
    ui.anchorX.value = String(state.anchor.x);
    ui.anchorY.value = String(state.anchor.y);
    ui.anchorZ.value = String(state.anchor.z);
    ui.editorGridW.value = String(state.gridW);
    ui.editorGridH.value = String(state.gridH);
    ui.currentLayer.value = String(state.currentLayer);
    ui.previewScale.value = String(state.previewScale);
    ui.applyFillSelection.classList.add('primaryAction');
  }


  function applySpritePreviewOpacity(raw, source = 'ui') {
    const n = Number(raw);
    let opacity = n > 1 ? n / 100 : n;
    opacity = Math.max(0.05, Math.min(1, Number.isFinite(opacity) ? opacity : 1));
    state.sprite.previewOpacity = opacity;
    if (ui.spritePreviewOpacity) ui.spritePreviewOpacity.value = String(opacity);
    if (ui.spritePreviewOpacityNumber) ui.spritePreviewOpacityNumber.value = String(Math.round(opacity * 100));
    if (ui.spritePreviewOpacityValue) ui.spritePreviewOpacityValue.textContent = `${Math.round(opacity * 100)}%`;
    detailEditorLog(`sprite:previewOpacity source=${source} value=${opacity.toFixed(2)}`);
  }

  function collectExportVoxels(options = {}) {
    const spriteVisible = !!options.spriteVisible;
    const out = new Map();
    const baseVoxels = sortedVoxels();
    for (const v of baseVoxels) {
      const key = vkey(v.x, v.y, v.z);
      out.set(key, { x: v.x, y: v.y, z: v.z, solid: v.solid !== false, collidable: v.collidable !== false, base: state.base });
    }
    if (out.size === 0 && spriteVisible) {
      const cols = sanitizeFootprintValue(state.spriteFit.footprintCols);
      const rows = sanitizeFootprintValue(state.spriteFit.footprintRows);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const key = vkey(x, y, 0);
          out.set(key, { x, y, z: 0, solid: true, collidable: true, base: state.base });
        }
      }
      detailEditorLog(`export:auto-footprint-proxy cells=${out.size} footprint=${cols}x${rows}`);
    } else {
      let mergedSelection = 0;
      if (out.size === 0 && state.selection && Array.isArray(state.selection.cells) && state.selection.cells.length) {
        for (const c of state.selection.cells) {
          if (!withinGrid(c.x, c.y) || c.z < state.currentLayer) continue;
          const key = vkey(c.x, c.y, c.z);
          if (out.has(key)) continue;
          out.set(key, { x: c.x, y: c.y, z: c.z, solid: true, collidable: true, base: state.base });
          mergedSelection += 1;
        }
        if (mergedSelection) {
          detailEditorLog(`export:auto-merge-selection merged=${mergedSelection} reason=no-voxels`);
          setStatus(`保存时检测到当前 voxel 为空，已自动把选区并入代理体（${mergedSelection} 个）`);
        }
      }
    }
    return Array.from(out.values()).sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  }

  function createPrefabObject(options = {}) {
    const { includeSpriteImageData = true } = options;
    syncFormToState();
    const spriteImageForExport = state.sprite.imageExport || (!state.sprite.objectUrl ? state.sprite.image : '');
    const spriteVisible = hasSpriteImage();
    const exportVoxels = collectExportVoxels({ spriteVisible });
    return {
      id: state.id,
      name: state.name,
      kind: state.kind,
      asset: state.asset,
      base: state.base,
      renderMode: spriteVisible ? (state.renderMode || 'sprite_proxy') : 'voxel',
      anchor: { ...state.anchor },
      voxels: exportVoxels,
      sprite: spriteVisible ? {
        image: includeSpriteImageData
          ? spriteImageForExport
          : `[editor preview omitted inline image data${state.sprite.fileName ? `: ${state.sprite.fileName}` : ''}]`,
        fileName: state.sprite.fileName || '',
        scale: state.sprite.scale || 1,
        offsetPx: { x: state.sprite.offsetX || 0, y: state.sprite.offsetY || 0 },
        previewOpacity: state.sprite.previewOpacity || 1,
        anchorMode: 'bottom-center',
        sortMode: 'box_occlusion'
      } : null,
      slices: [],
      custom: true,
    };
  }

  function selectionBounds(cells) {
    if (!cells || !cells.length) return null;
    const xs = cells.map(c => c.x), ys = cells.map(c => c.y), zs = cells.map(c => c.z);
    return {
      x0: Math.min(...xs), x1: Math.max(...xs),
      y0: Math.min(...ys), y1: Math.max(...ys),
      z0: Math.min(...zs), z1: Math.max(...zs),
      count: cells.length,
    };
  }

  function updateSummaryPanels() {
    const prefab = createPrefabObject({ includeSpriteImageData: false });
    ui.voxelCountText.textContent = `体素数：${prefab.voxels.length}${state.voxels.size === 0 && state.selection.cells.length ? '（保存时将自动并入当前选区）' : ''}${hasSpriteImage() ? ' · JSON 预览已省略内嵌图片数据' : ''}`;
    ui.gridSummary.textContent = `当前层 L=${state.currentLayer} · 网格 ${state.gridW}×${state.gridH}`;
    const maxX = prefab.voxels.length ? Math.max(...prefab.voxels.map(v => v.x)) + 1 : 0;
    const maxY = prefab.voxels.length ? Math.max(...prefab.voxels.map(v => v.y)) + 1 : 0;
    const maxZ = prefab.voxels.length ? Math.max(...prefab.voxels.map(v => v.z)) + 1 : 0;
    ui.previewSummary.textContent = `build=${BUILD_VERSION} · 基准层 L=${state.currentLayer} · 当前层体素=${countLayerVoxels(state.currentLayer)} · 总尺寸 ${maxX}×${maxY}×${maxZ} · 交互=${state.interactionMode === 'sprite' ? '图片模式' : 'voxel 模式'} · 自动占地=${sanitizeFootprintValue(state.spriteFit.footprintCols)}×${sanitizeFootprintValue(state.spriteFit.footprintRows)}`;
    const sel = selectionBounds(state.selection.cells);
    ui.modeSummary.textContent = sel
      ? `build=${BUILD_VERSION} · 选区 ${sel.x1 - sel.x0 + 1}×${sel.y1 - sel.y0 + 1}×${sel.z1 - sel.z0 + 1} · cells=${sel.count} · 规则：z>=L 可选，z<L 灰显禁编`
      : `build=${BUILD_VERSION} · 统一基准层选区模式 · 规则：当前层高亮，上层正常，下层灰显禁编`;
  }
  function flushJsonPreview() {
    jsonPreviewTimer = 0;
    if (!jsonPreviewDirty) return;
    jsonPreviewDirty = false;
    const prefab = createPrefabObject({ includeSpriteImageData: false });
    const nextText = JSON.stringify(prefab, null, 2);
    if (nextText !== lastJsonPreviewText) {
      ui.jsonPreview.value = nextText;
      lastJsonPreviewText = nextText;
    }
  }
  function scheduleJsonPreviewUpdate(immediate = false) {
    jsonPreviewDirty = true;
    if (immediate) {
      if (jsonPreviewTimer) { clearTimeout(jsonPreviewTimer); jsonPreviewTimer = 0; }
      flushJsonPreview();
      return;
    }
    if (jsonPreviewTimer) return;
    jsonPreviewTimer = window.setTimeout(flushJsonPreview, 120);
  }


function isSpriteInteractionMode() {
  return state.interactionMode === 'sprite';
}
function updateInteractionModeUi() {
  if (ui.interactionModeSummary) {
    if (isSpriteInteractionMode()) {
      const sampleHint = state.spriteFit.pickSampleActive ? ' · 当前处于“点取参考高度”模式：点击图片本体会按该高度自动重算左右边界。' : '';
      const lockHint = state.spriteFit.lockHorizontal ? ' · 已锁定水平拖拽。' : '';
      ui.interactionModeSummary.textContent = `当前交互：图片模式（由步骤页自动切换） · 右侧允许拖拽 / 缩放图片；左侧 voxel 网格和右侧 voxel 选区都会被锁定${lockHint}${sampleHint}`;
    } else {
      ui.interactionModeSummary.textContent = '当前交互：voxel 模式（由步骤页自动切换） · 右侧负责选区，左侧局部网格负责体素精修。';
    }
  }
  const cursor = isSpriteInteractionMode() ? (state.spriteDrag.active ? 'grabbing' : (state._spriteScreenRect ? 'grab' : 'default')) : 'crosshair';
  if (previewCanvas) previewCanvas.style.cursor = cursor;
}
function setInteractionMode(mode, reason = 'ui') {
  const next = mode === 'sprite' ? 'sprite' : 'voxel';
  if (state.interactionMode === next) {
    updateInteractionModeUi();
    return;
  }
  state.interactionMode = next;
  state.spriteDrag.active = false;
  detailEditorLog(`interaction-mode:set mode=${next} reason=${reason}`);
  setStatus(next === 'sprite' ? '已切换到图片模式：现在只能操作图片' : '已切换到 voxel 模式：现在可以编辑选区和 voxel');
  rerender();
}

  function configureCanvas(canvas, ctx, fallbackW, fallbackH) {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = canvas.getBoundingClientRect();
    const cssW = Math.max(1, Math.round(rect.width || fallbackW || canvas.width || 1));
    const cssH = Math.max(1, Math.round(rect.height || fallbackH || canvas.height || 1));
    const pixelW = Math.max(1, Math.round(cssW * dpr));
    const pixelH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW; canvas.height = pixelH;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return { w: cssW, h: cssH, dpr };
  }

  function shade(hex, factor) {
    const clean = (hex || '#c7b0df').replace('#', '');
    const n = parseInt(clean, 16);
    const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * factor)));
    const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * factor)));
    const b = Math.max(0, Math.min(255, Math.round((n & 255) * factor)));
    return `rgb(${r},${g},${b})`;
  }
  function mixHex(hex, targetHex, t) {
    const parse = (h) => {
      const clean = (h || '#000000').replace('#', '');
      const n = parseInt(clean, 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };
    const [r1, g1, b1] = parse(hex);
    const [r2, g2, b2] = parse(targetHex);
    const m = Math.max(0, Math.min(1, t));
    const r = Math.round(r1 + (r2 - r1) * m);
    const g = Math.round(g1 + (g2 - g1) * m);
    const b = Math.round(b1 + (b2 - b1) * m);
    return `rgb(${r},${g},${b})`;
  }
  function isoRaw(x, y, z, tileW, tileH) { return { x: (x - y) * tileW / 2, y: (x + y) * tileH / 2 - z * tileH }; }
  function iso(x, y, z, tileW, tileH, ox, oy) {
    const p = isoRaw(x, y, z, tileW, tileH); return { x: ox + p.x, y: oy + p.y };
  }
  function snapPoint(pt) { return { x: Math.round(pt.x) + 0.5, y: Math.round(pt.y) + 0.5 }; }
  function voxelPoints(v, tileW, tileH, ox, oy) {
    return {
      p000: snapPoint(iso(v.x, v.y, v.z, tileW, tileH, ox, oy)),
      p100: snapPoint(iso(v.x + 1, v.y, v.z, tileW, tileH, ox, oy)),
      p110: snapPoint(iso(v.x + 1, v.y + 1, v.z, tileW, tileH, ox, oy)),
      p010: snapPoint(iso(v.x, v.y + 1, v.z, tileW, tileH, ox, oy)),
      p001: snapPoint(iso(v.x, v.y, v.z + 1, tileW, tileH, ox, oy)),
      p101: snapPoint(iso(v.x + 1, v.y, v.z + 1, tileW, tileH, ox, oy)),
      p111: snapPoint(iso(v.x + 1, v.y + 1, v.z + 1, tileW, tileH, ox, oy)),
      p011: snapPoint(iso(v.x, v.y + 1, v.z + 1, tileW, tileH, ox, oy)),
    };
  }
  function planeCellPolygon(x, y, z, tileW, tileH, ox, oy) {
    return [
      snapPoint(iso(x, y, z, tileW, tileH, ox, oy)),
      snapPoint(iso(x + 1, y, z, tileW, tileH, ox, oy)),
      snapPoint(iso(x + 1, y + 1, z, tileW, tileH, ox, oy)),
      snapPoint(iso(x, y + 1, z, tileW, tileH, ox, oy)),
    ];
  }
  function voxelTopPolygon(v, tileW, tileH, ox, oy) {
    const pts = voxelPoints(v, tileW, tileH, ox, oy);
    return [pts.p001, pts.p101, pts.p111, pts.p011];
  }
  function pointInPolygon(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }
  function drawPolygon(ctx, poly, stroke, fill = null, lineWidth = 1.2, dash = null) {
    if (!poly || !poly.length) return;
    ctx.save();
    if (dash) ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke();
    ctx.restore();
  }
  function drawVoxelIso(ctx, v, tileW, tileH, ox, oy, baseColor, alpha = 1) {
    const pts = voxelPoints(v, tileW, tileH, ox, oy);
    ctx.save(); ctx.globalAlpha = alpha; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 1.05;
    ctx.beginPath(); ctx.moveTo(pts.p001.x, pts.p001.y); ctx.lineTo(pts.p101.x, pts.p101.y); ctx.lineTo(pts.p111.x, pts.p111.y); ctx.lineTo(pts.p011.x, pts.p011.y); ctx.closePath();
    ctx.fillStyle = shade(baseColor, 1.06); ctx.fill(); ctx.strokeStyle = '#111827'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts.p101.x, pts.p101.y); ctx.lineTo(pts.p111.x, pts.p111.y); ctx.lineTo(pts.p110.x, pts.p110.y); ctx.lineTo(pts.p100.x, pts.p100.y); ctx.closePath();
    ctx.fillStyle = shade(baseColor, 0.92); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(pts.p011.x, pts.p011.y); ctx.lineTo(pts.p111.x, pts.p111.y); ctx.lineTo(pts.p110.x, pts.p110.y); ctx.lineTo(pts.p010.x, pts.p010.y); ctx.closePath();
    ctx.fillStyle = shade(baseColor, 0.82); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  function normalizeRect(a, b) {
    return { x0: Math.min(a.x, b.x), x1: Math.max(a.x, b.x), y0: Math.min(a.y, b.y), y1: Math.max(a.y, b.y), z: a.z };
  }
  function rectCells(a, b) {
    const n = normalizeRect(a, b); const cells = [];
    for (let y = n.y0; y <= n.y1; y++) for (let x = n.x0; x <= n.x1; x++) cells.push({ x, y, z: n.z });
    return cells;
  }
  function volumeCells(a, b, height) {
    const base = normalizeRect(a, b); const cells = [];
    for (let z = base.z; z < base.z + height; z++) for (let y = base.y0; y <= base.y1; y++) for (let x = base.x0; x <= base.x1; x++) cells.push({ x, y, z });
    return cells;
  }

  function ghostAlpha(z) {
    if (z >= state.currentLayer) return 1;
    const diff = state.currentLayer - z;
    return diff === 1 ? 0.48 : diff === 2 ? 0.34 : 0.22;
  }
  function colorForVoxel(v) {
    if (v.z < state.currentLayer) return '#8b94a4';
    if (v.z === state.currentLayer) return mixHex(state.base, '#55a8ff', 0.72);
    return state.base;
  }
  function isSelectionVisualMode() {
    const s = state.selection;
    return !!(s.cells.length || s.start || s.stage !== 'idle');
  }
  function getLiveSelectionCells() {
    const s = state.selection;
    if (state.tool === 'rect') {
      if (s.stage === 'rect-start' && s.start) {
        const end = state.hoverCell && state.hoverCell.type === 'layer-cell' ? state.hoverCell : s.start;
        return rectCells(s.start, end);
      }
      if (s.kind === 'rect' && s.cells.length) return s.cells;
      return [];
    }
    if (state.tool === 'box') {
      if (s.stage !== 'idle' && s.start) {
        const end = s.end || (state.hoverCell && state.hoverCell.type === 'layer-cell' ? state.hoverCell : s.start);
        const height = s.stage === 'box-height' ? s.height : 1;
        return volumeCells(s.start, end, height);
      }
      if (s.kind === 'box' && s.cells.length) return s.cells;
      return [];
    }
    return state.selection.cells || [];
  }

  function unitIsoExtents(points) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
    return { minX, maxX, minY, maxY };
  }
  function computePreviewMetrics() {
    const c = configureCanvas(previewCanvas, previewCtx, 980, 720);
    const samplePoints = [];
    const planes = [0, state.currentLayer];
    for (const planeZ of planes) {
      samplePoints.push(
        isoRaw(0, 0, planeZ, 2, 1),
        isoRaw(state.gridW, 0, planeZ, 2, 1),
        isoRaw(state.gridW, state.gridH, planeZ, 2, 1),
        isoRaw(0, state.gridH, planeZ, 2, 1),
      );
    }
    for (const v of sortedVoxels()) {
      const pts = [
        isoRaw(v.x, v.y, v.z, 2, 1), isoRaw(v.x + 1, v.y, v.z, 2, 1), isoRaw(v.x + 1, v.y + 1, v.z, 2, 1), isoRaw(v.x, v.y + 1, v.z, 2, 1),
        isoRaw(v.x, v.y, v.z + 1, 2, 1), isoRaw(v.x + 1, v.y, v.z + 1, 2, 1), isoRaw(v.x + 1, v.y + 1, v.z + 1, 2, 1), isoRaw(v.x, v.y + 1, v.z + 1, 2, 1),
      ];
      samplePoints.push(...pts);
    }
    if (!samplePoints.length) samplePoints.push({ x: 0, y: 0 });
    const ext = unitIsoExtents(samplePoints);
    const padX = 82, padY = 96;
    const usableW = Math.max(120, c.w - padX * 2);
    const usableH = Math.max(120, c.h - padY * 2);
    const unitWidth = Math.max(1, ext.maxX - ext.minX);
    const unitHeight = Math.max(1, ext.maxY - ext.minY);
    const scaleFromFit = Math.min(usableW / unitWidth, usableH / unitHeight) * state.previewScale;
    const tileW = Math.max(12, Math.min(72, scaleFromFit));
    const tileH = tileW / 2;
    const scaledWidth = unitWidth * tileW;
    const scaledHeight = unitHeight * tileW;
    const ox = Math.round((c.w - scaledWidth) / 2 - ext.minX * tileW) + 0.5;
    const oy = Math.round((c.h - scaledHeight) / 2 - ext.minY * tileW) + 0.5;
    state._previewMetrics = { ...c, tileW, tileH, ox, oy, cameraPlaneZ: 0, workplaneZ: state.currentLayer };
    return state._previewMetrics;
  }

  function drawGridTopdown() {
    const metrics = configureCanvas(gridCanvas, gridCtx, 560, 560);
    const { w, h } = metrics;
    gridCtx.clearRect(0, 0, w, h); gridCtx.fillStyle = '#0d1320'; gridCtx.fillRect(0, 0, w, h);
    const cell = Math.min((w - 40) / state.gridW, (h - 40) / state.gridH);
    const ox = Math.round((w - cell * state.gridW) / 2), oy = Math.round((h - cell * state.gridH) / 2);
    state._gridMetrics = { cell, ox, oy, w, h };
    const selectedSet = new Set(state.selection.cells.map(c => vkey(c.x, c.y, c.z)));
    for (let y = 0; y < state.gridH; y++) {
      for (let x = 0; x < state.gridW; x++) {
        const px = ox + x * cell, py = oy + y * cell;
        const onLayer = hasVoxel(x, y, state.currentLayer);
        let below = false, above = false;
        for (const key of state.voxels.keys()) {
          const p = parseKey(key);
          if (p.x === x && p.y === y) { if (p.z < state.currentLayer) below = true; if (p.z > state.currentLayer) above = true; }
        }
        const selected = selectedSet.has(vkey(x, y, state.currentLayer));
        gridCtx.fillStyle = selected ? 'rgba(126,200,255,0.32)' : onLayer ? state.base : above ? 'rgba(200,210,220,0.16)' : below ? 'rgba(130,177,255,0.12)' : '#111827';
        gridCtx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
        gridCtx.strokeStyle = selected ? '#d9f1ff' : onLayer ? '#dfe8ff' : '#2b3244';
        gridCtx.strokeRect(px + 0.5, py + 0.5, cell, cell);
      }
    }
  }
  function gridCellFromMouse(e) {
    const rect = gridCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const m = state._gridMetrics; if (!m) return null;
    const x = Math.floor((mx - m.ox) / m.cell), y = Math.floor((my - m.oy) / m.cell);
    if (!withinGrid(x, y)) return null;
    return { x, y, z: state.currentLayer };
  }

  function drawBaseZeroGrid(ctx, m) {
    const z = 0;
    for (let y = 0; y < state.gridH; y++) {
      for (let x = 0; x < state.gridW; x++) {
        const poly = planeCellPolygon(x, y, z, m.tileW, m.tileH, m.ox, m.oy);
        drawPolygon(ctx, poly, 'rgba(235,241,255,0.12)', null, 0.9);
      }
    }
    const outer = [
      snapPoint(iso(0, 0, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(state.gridW, 0, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(state.gridW, state.gridH, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(0, state.gridH, z, m.tileW, m.tileH, m.ox, m.oy)),
    ];
    drawPolygon(ctx, outer, 'rgba(245,248,255,0.42)', null, 1.3);
  }
  function drawWorkplaneGrid(ctx, m) {
    const z = state.currentLayer;
    const fill = 'rgba(90,168,255,0.08)';
    const stroke = 'rgba(90,168,255,0.92)';
    for (let y = 0; y < state.gridH; y++) {
      for (let x = 0; x < state.gridW; x++) {
        const poly = planeCellPolygon(x, y, z, m.tileW, m.tileH, m.ox, m.oy);
        drawPolygon(ctx, poly, stroke, fill, 1.15);
      }
    }
    const outer = [
      snapPoint(iso(0, 0, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(state.gridW, 0, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(state.gridW, state.gridH, z, m.tileW, m.tileH, m.ox, m.oy)),
      snapPoint(iso(0, state.gridH, z, m.tileW, m.tileH, m.ox, m.oy)),
    ];
    drawPolygon(ctx, outer, 'rgba(96,174,255,0.98)', 'rgba(96,174,255,0.08)', 2.2);
  }

  function drawSelectionOverlay(ctx, m, cells) {
    if (!cells || !cells.length) return;
    const existing = new Set(state.voxels.keys());
    for (const c of cells) {
      if (c.z < state.currentLayer) continue;
      const key = vkey(c.x, c.y, c.z);
      if (existing.has(key)) {
        drawVoxelIso(ctx, c, m.tileW, m.tileH, m.ox, m.oy, colorForVoxel(c), 1);
        drawPolygon(ctx, voxelTopPolygon(c, m.tileW, m.tileH, m.ox, m.oy), 'rgba(148,214,255,0.99)', 'rgba(86,170,255,0.18)', 2.2);
      } else {
        drawVoxelIso(ctx, c, m.tileW, m.tileH, m.ox, m.oy, '#8fd6ff', 0.34);
        drawPolygon(ctx, planeCellPolygon(c.x, c.y, c.z, m.tileW, m.tileH, m.ox, m.oy), 'rgba(148,214,255,0.99)', 'rgba(86,170,255,0.24)', 2.0, [5, 3]);
      }
    }
  }



function getEditorSpriteDrawRect(m = state._previewMetrics) {
  if (!state.sprite.image || state.renderMode === 'voxel' || !m) { state._spriteScreenRect = null; return null; }
  const img = ensureEditorSpriteImage(state.sprite.image);
  if (!img || !img.complete || !img.naturalWidth || !img.naturalHeight) { state._spriteScreenRect = null; return null; }
  const anchor = iso(state.anchor.x || 0, state.anchor.y || 0, state.anchor.z || 0, m.tileW, m.tileH, m.ox, m.oy);
  const pixelScale = (m.tileW / 64);
  const scale = (state.sprite.scale || 1) * pixelScale;
  const drawW = Math.max(1, Math.round(img.naturalWidth * scale));
  const drawH = Math.max(1, Math.round(img.naturalHeight * scale));
  const offsetX = Math.round((state.sprite.offsetX || 0) * pixelScale);
  const offsetY = Math.round((state.sprite.offsetY || 0) * pixelScale);
  const x = Math.round(anchor.x - drawW / 2 + offsetX);
  const y = Math.round(anchor.y - drawH + offsetY);
  const rect = { img, anchor, pixelScale, scale, drawW, drawH, x, y, right: x + drawW, bottom: y + drawH };
  state._spriteScreenRect = rect;
  return rect;
}
function spriteHitFromClient(clientX, clientY) {
  const rect = previewCanvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const r = getEditorSpriteDrawRect();
  if (!r) return null;
  return (sx >= r.x && sx <= r.right && sy >= r.y && sy <= r.bottom) ? Object.assign({}, r, { localX: sx, localY: sy }) : null;
}
function spriteResizeHandleFromClient(clientX, clientY) {
  const rect = previewCanvas.getBoundingClientRect();
  const sx = clientX - rect.left;
  const sy = clientY - rect.top;
  const r = getEditorSpriteDrawRect();
  if (!r) return null;
  const size = 14;
  const hx = r.right - size - 4;
  const hy = r.bottom - size - 4;
  return (sx >= hx && sx <= hx + size && sy >= hy && sy <= hy + size) ? Object.assign({}, r, { handleX: hx, handleY: hy, handleSize: size, localX: sx, localY: sy }) : null;
}
function updatePreviewCanvasCursor(clientX = null, clientY = null) {
  if (!previewCanvas) return;
  previewCanvas.classList.remove('dragSprite', 'resizeSprite');
  if (!isSpriteInteractionMode()) return;
  if (state.spriteResize.active) { previewCanvas.classList.add('resizeSprite'); return; }
  if (state.spriteDrag.active) { previewCanvas.classList.add('dragSprite'); return; }
  if (clientX == null || clientY == null) return;
  if (spriteResizeHandleFromClient(clientX, clientY)) previewCanvas.classList.add('resizeSprite');
  else if (spriteHitFromClient(clientX, clientY)) previewCanvas.classList.add('dragSprite');
}

function drawEditorSpriteOverlay(ctx, m) {
  const r = getEditorSpriteDrawRect(m);
  if (!r) return;
  ctx.save();
  ctx.globalAlpha = (state.sprite.previewOpacity || 1) * (state.renderMode === 'hybrid' ? 0.92 : 1);
  ctx.imageSmoothingEnabled = true;
  const spriteCanvas = getCachedEditorSpriteCanvas(r.img, r.drawW, r.drawH);
  ctx.drawImage(spriteCanvas || r.img, r.x, r.y, r.drawW, r.drawH);
  ctx.restore();
  const overlay = (state.spriteFit.guidesVisible || state.spriteFit.pickSampleActive) ? getSpriteGuideOverlay(m) : null;
  if (overlay) {
    ctx.save();
    ctx.lineWidth = 1.15;
    ctx.strokeStyle = 'rgba(255,205,102,0.95)';
    ctx.beginPath(); ctx.moveTo(overlay.imageLeftX, overlay.topY); ctx.lineTo(overlay.imageLeftX, overlay.bottomY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(overlay.imageRightX, overlay.topY); ctx.lineTo(overlay.imageRightX, overlay.bottomY); ctx.stroke();
    if (state.spriteFit.detectionMode === 'sample-band' || state.spriteFit.pickSampleActive) {
      const bandTop = overlay.rect.y + overlay.bounds.top * overlay.rect.scale;
      const bandBottom = overlay.rect.y + (overlay.bounds.bottom + 1) * overlay.rect.scale;
      ctx.fillStyle = 'rgba(255,205,102,0.18)';
      ctx.fillRect(overlay.rect.x, bandTop, overlay.rect.drawW, Math.max(1, bandBottom - bandTop));
      ctx.strokeStyle = 'rgba(255,205,102,0.92)';
      ctx.beginPath(); ctx.moveTo(overlay.rect.x, overlay.sampleCenterY); ctx.lineTo(overlay.rect.right, overlay.sampleCenterY); ctx.stroke();
    }
    ctx.restore();
  }
  drawPolygon(ctx, [
    { x: r.anchor.x - 4, y: r.anchor.y },
    { x: r.anchor.x, y: r.anchor.y - 4 },
    { x: r.anchor.x + 4, y: r.anchor.y },
    { x: r.anchor.x, y: r.anchor.y + 4 },
  ], 'rgba(255,210,90,0.95)', 'rgba(255,210,90,0.20)', 1.2);
  if (isSpriteInteractionMode()) {
    ctx.save();
    ctx.setLineDash([6, 4]);
    ctx.strokeStyle = state.spriteFit.pickSampleActive ? 'rgba(255,205,102,0.98)' : 'rgba(140,210,255,0.95)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x + 0.5, r.y + 0.5, r.drawW, r.drawH);
    ctx.setLineDash([]);
    const size = 14;
    const hx = r.right - size - 4;
    const hy = r.bottom - size - 4;
    ctx.fillStyle = 'rgba(86,170,255,0.95)';
    ctx.strokeStyle = 'rgba(227,244,255,0.98)';
    ctx.lineWidth = 1.2;
    ctx.fillRect(hx, hy, size, size);
    ctx.strokeRect(hx + 0.5, hy + 0.5, size, size);
    ctx.beginPath();
    ctx.moveTo(hx + 4, hy + size - 4);
    ctx.lineTo(hx + size - 4, hy + 4);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPreviewScene() {

    const m = computePreviewMetrics();
    previewCtx.clearRect(0, 0, m.w, m.h);
    previewCtx.fillStyle = '#0d1320'; previewCtx.fillRect(0, 0, m.w, m.h);

    const all = sortedVoxels().sort((a, b) => (a.x + a.y + a.z) - (b.x + b.y + b.z) || a.z - b.z || a.y - b.y || a.x - b.x);
    const below = all.filter(v => v.z < state.currentLayer);
    const active = all.filter(v => v.z >= state.currentLayer);
    const liveSelectionCells = getLiveSelectionCells();
    const selectionVisualMode = isSelectionVisualMode() && !isSpriteInteractionMode();
    const activeAlpha = selectionVisualMode ? 0.38 : 1;

    drawBaseZeroGrid(previewCtx, m);
    for (const v of below) drawVoxelIso(previewCtx, v, m.tileW, m.tileH, m.ox, m.oy, colorForVoxel(v), ghostAlpha(v.z));
    drawWorkplaneGrid(previewCtx, m);
    for (const v of active) drawVoxelIso(previewCtx, v, m.tileW, m.tileH, m.ox, m.oy, colorForVoxel(v), activeAlpha);


    drawSelectionOverlay(previewCtx, m, liveSelectionCells);
    drawEditorSpriteOverlay(previewCtx, m);

    if (state.hoverCell) {
      const isVoxelTop = state.hoverCell.type === 'voxel-top';
      const poly = isVoxelTop ? voxelTopPolygon(state.hoverCell, m.tileW, m.tileH, m.ox, m.oy) : planeCellPolygon(state.hoverCell.x, state.hoverCell.y, state.hoverCell.z, m.tileW, m.tileH, m.ox, m.oy);
      drawPolygon(previewCtx, poly, isVoxelTop ? 'rgba(255,220,120,0.98)' : 'rgba(170,220,255,0.95)', isVoxelTop ? 'rgba(255,220,120,0.12)' : 'rgba(170,220,255,0.12)', 2.15);
    }
  }

  function previewPickFromClient(clientX, clientY) {
    const rect = previewCanvas.getBoundingClientRect();
    const localX = clientX - rect.left, localY = clientY - rect.top;
    const m = state._previewMetrics; if (!m) return null;
    if (isSpriteInteractionMode()) {
      const spriteHit = spriteHitFromClient(clientX, clientY);
      if (spriteHit) return { type: 'sprite', x: state.anchor.x || 0, y: state.anchor.y || 0, z: state.anchor.z || 0, occupied: !!state.sprite.image, localX, localY };
    }

    const planePick = () => {
      for (let y = state.gridH - 1; y >= 0; y--) {
        for (let x = state.gridW - 1; x >= 0; x--) {
          const poly = planeCellPolygon(x, y, state.currentLayer, m.tileW, m.tileH, m.ox, m.oy);
          if (pointInPolygon(localX, localY, poly)) {
            return { type: 'layer-cell', x, y, z: state.currentLayer, localX, localY, poly, occupied: hasVoxel(x, y, state.currentLayer) };
          }
        }
      }
      return null;
    };

    if (state.tool === 'single') {
      const voxels = sortedVoxels().filter(v => v.z >= state.currentLayer).slice().sort((a, b) => (b.x + b.y + b.z) - (a.x + a.y + a.z) || b.z - a.z || b.y - a.y || b.x - a.x);
      for (const v of voxels) {
        const poly = voxelTopPolygon(v, m.tileW, m.tileH, m.ox, m.oy);
        if (pointInPolygon(localX, localY, poly)) return { type: 'voxel-top', x: v.x, y: v.y, z: v.z, localX, localY, poly, occupied: true };
      }
    }

    const plane = planePick();
    if (plane) return plane;
    return { type: 'miss', localX, localY, z: state.currentLayer };
  }

  function hoverSignature(pick) {
    if (!pick || pick.type === 'miss') return 'miss';
    return `${pick.type}:${pick.x},${pick.y},${pick.z},${pick.occupied}`;
  }
  function logHoverChange(pick, source) {
    const sig = hoverSignature(pick);
    if (sig === lastHoverSignature) return;
    lastHoverSignature = sig;
    if (previewLogCount >= PREVIEW_LOG_LIMIT) return;
    previewLogCount += 1;
    if (!pick || pick.type === 'miss') {
      detailEditorLog(`${source} pick=miss layer=${state.currentLayer} local=(${pick?.localX?.toFixed?.(1) ?? 'n/a'},${pick?.localY?.toFixed?.(1) ?? 'n/a'})`);
      return;
    }
    detailEditorLog(`${source} pick=${pick.type} cell=(${pick.x},${pick.y},${pick.z}) occupied=${pick.occupied} local=(${pick.localX.toFixed(1)},${pick.localY.toFixed(1)}) layer=${state.currentLayer}`);
  }

  function setSelection(kind, cells, meta = {}) {
    state.selection.kind = kind;
    state.selection.cells = cells;
    if ('start' in meta) state.selection.start = meta.start;
    if ('end' in meta) state.selection.end = meta.end;
    if ('height' in meta) state.selection.height = meta.height;
    if ('stage' in meta) state.selection.stage = meta.stage;
    if ('anchorClientY' in meta) state.selection.anchorClientY = meta.anchorClientY;
    const b = selectionBounds(cells);
    detailEditorLog(`selection:set kind=${kind} cells=${cells.length} bounds=${b ? `(${b.x0},${b.y0},${b.z0})-(${b.x1},${b.y1},${b.z1})` : 'none'}`);
  }
  function clearSelectionState(reason = 'clear-selection') {
    const had = state.selection.cells.length || state.selection.stage !== 'idle';
    state.selection = { kind: 'none', cells: [], start: null, end: null, height: 1, stage: 'idle', anchorClientY: 0 };
    if (had) detailEditorLog(`selection:clear reason=${reason}`);
    updateToolUi();
  }

  function commitFillSelection() {
    if (isSpriteInteractionMode()) { setStatus('当前是图片模式，不能填充 voxel 选区', false); return; }
    if (!state.selection.cells.length) { setStatus('当前没有选区可填充', false); return; }
    let added = 0, skippedExisting = 0, skippedOut = 0, maxX = 0, maxY = 0;
    for (const c of state.selection.cells) {
      if (!withinGrid(c.x, c.y)) { skippedOut += 1; continue; }
      if (c.z < state.currentLayer) { skippedOut += 1; continue; }
      if (hasVoxel(c.x, c.y, c.z)) { skippedExisting += 1; continue; }
      if (setVoxel(c.x, c.y, c.z)) { added += 1; maxX = Math.max(maxX, c.x); maxY = Math.max(maxY, c.y); }
    }
    if (added) ensureGridFit(maxX, maxY);
    detailEditorLog(`selection:fill cells=${state.selection.cells.length} added=${added} skippedExisting=${skippedExisting} skippedOut=${skippedOut}`);
    setStatus(`已填充选区，新增 ${added} 个 voxel`);
    rerender();
  }
  function commitDeleteSelection() {
    if (isSpriteInteractionMode()) { setStatus('当前是图片模式，不能删除 voxel 选区', false); return; }
    if (!state.selection.cells.length) { setStatus('当前没有选区可删除', false); return; }
    let removed = 0, skippedOut = 0;
    for (const c of state.selection.cells) {
      if (!withinGrid(c.x, c.y) || c.z < state.currentLayer) { skippedOut += 1; continue; }
      if (removeVoxel(c.x, c.y, c.z)) removed += 1;
    }
    detailEditorLog(`selection:delete cells=${state.selection.cells.length} removed=${removed} skippedOut=${skippedOut}`);
    setStatus(`已删除选区中的 ${removed} 个 voxel`);
    rerender();
  }

  function adjustBoxHeightFromClientY(clientY) {
    if (state.tool !== 'box' || state.selection.stage !== 'box-height') return;
    const step = Math.max(10, state._previewMetrics ? state._previewMetrics.tileH : 16);
    const diff = state.selection.anchorClientY - clientY;
    const next = Math.max(1, Math.round(diff / step) + 1);
    if (next !== state.selection.height) {
      state.selection.height = next;
      detailEditorLog(`box:height clientY=${clientY} anchorY=${state.selection.anchorClientY} step=${step} height=${next}`);
      updateToolUi(); rerender();
    }
  }

  function confirmCurrentBoxSelection(reason = 'click') {
    if (state.tool !== 'box' || state.selection.stage !== 'box-height' || !state.selection.start || !state.selection.end) return false;
    const cells = volumeCells(state.selection.start, state.selection.end, state.selection.height);
    setSelection('box', cells, { start: state.selection.start, end: state.selection.end, height: state.selection.height, stage: 'idle' });
    detailEditorLog(`box:confirm reason=${reason} height=${state.selection.height} cells=${cells.length}`);
    setStatus(`体积选区已确定，尺寸 ${cells.length} cells`);
    updateToolUi();
    rerender();
    return true;
  }

  function applyPreviewPrimaryAction(pick, e) {
    if (isSpriteInteractionMode()) { detailEditorLog('preview:primary blocked interactionMode=sprite'); setStatus('当前是图片模式：右侧只允许拖拽/缩放图片', false); return; }
    if (!pick || pick.type === 'miss') {
      detailEditorLog(`preview:primary miss tool=${state.tool}`); return;
    }
    if (state.tool === 'single') {
      if (pick.type === 'voxel-top') {
        setSelection('single', [{ x: pick.x, y: pick.y, z: pick.z }]);
        setStatus(`已选中顶面 voxel (${pick.x}, ${pick.y}, ${pick.z})`);
      } else {
        setSelection('single', [{ x: pick.x, y: pick.y, z: state.currentLayer }]);
        setStatus(`已选中当前层格子 (${pick.x}, ${pick.y}, ${state.currentLayer})`);
      }
      rerender(); return;
    }
    if (pick.type !== 'layer-cell') {
      detailEditorLog(`preview:primary ignore type=${pick.type} tool=${state.tool}`); return;
    }
    if (state.tool === 'rect') {
      if (state.selection.stage !== 'rect-start' || !state.selection.start) {
        setSelection('draft-rect', [], { start: { x: pick.x, y: pick.y, z: state.currentLayer }, stage: 'rect-start' });
        setStatus(`矩形选区起点已选：(${pick.x}, ${pick.y}, ${state.currentLayer})`);
      } else {
        const cells = rectCells(state.selection.start, { x: pick.x, y: pick.y, z: state.currentLayer });
        setSelection('rect', cells, { start: state.selection.start, end: { x: pick.x, y: pick.y, z: state.currentLayer }, stage: 'idle' });
        setStatus(`矩形选区已确定，共 ${cells.length} 个格子`);
      }
      updateToolUi(); rerender(); return;
    }
    if (state.tool === 'box') {
      if (state.selection.stage === 'idle' || !state.selection.start) {
        setSelection('draft-box', [], { start: { x: pick.x, y: pick.y, z: state.currentLayer }, end: { x: pick.x, y: pick.y, z: state.currentLayer }, stage: 'box-base', height: 1, anchorClientY: e.clientY });
        setStatus(`体积选区底面起点已选：(${pick.x}, ${pick.y}, ${state.currentLayer})`);
        updateToolUi(); rerender(); return;
      }
      if (state.selection.stage === 'box-base') {
        state.selection.end = { x: pick.x, y: pick.y, z: state.currentLayer };
        state.selection.stage = 'box-height';
        state.selection.anchorClientY = e.clientY;
        state.selection.height = 1;
        detailEditorLog(`box:base end=(${pick.x},${pick.y},${state.currentLayer})`);
        setStatus('体积选区底面已定；上下移动鼠标调高度，再点一次或按 Enter 确认选区');
        updateToolUi(); rerender(); return;
      }
      if (state.selection.stage === 'box-height') {
        confirmCurrentBoxSelection('click-resolved');
      }
    }
  }
  function applyPreviewSecondaryAction() {
    clearSelectionState('preview-secondary');
    setStatus('已清空当前选区');
    rerender();
  }

  function updateToolUi() {
    ui.toolPaint.classList.toggle('activeTool', state.tool === 'single');
    ui.toolRect.classList.toggle('activeTool', state.tool === 'rect');
    ui.toolVolume.classList.toggle('activeTool', state.tool === 'box');
    ui.toolErase.classList.toggle('activeTool', false);
    const blocked = isSpriteInteractionMode();
    [ui.toolPaint, ui.toolRect, ui.toolVolume, ui.applyFillSelection, ui.applyDeleteSelection].forEach(btn => btn && btn.classList.toggle('blockedMode', blocked));
    let text = '当前工具：单格选区 · 右侧点击选择当前层格子或基准层以上已有 voxel 顶面';
    if (state.tool === 'rect') text = state.selection.stage === 'rect-start' && state.selection.start
      ? `当前工具：矩形选区 · 起点=(${state.selection.start.x},${state.selection.start.y},${state.selection.start.z})，请选择对角点`
      : '当前工具：矩形选区 · 点击起点，再点击对角点；选择过程中会实时高亮';
    if (state.tool === 'box') {
      if (state.selection.stage === 'idle') text = '当前工具：体积选区 · 第一步，点底面起点；起点确定后才会进入实时高亮预览';
      else if (state.selection.stage === 'box-base') text = `当前工具：体积选区 · 第二步，点底面对角点；起点=(${state.selection.start.x},${state.selection.start.y},${state.selection.start.z})`;
      else text = `当前工具：体积选区 · 高度 h=${state.selection.height}；上下移动鼠标调高，再点一次或按 Enter 确认选区`;
    }
    if (isSpriteInteractionMode()) text = '当前工具：图片模式 · 右侧拖拽图片，Ctrl+滚轮缩放；voxel 选区与左侧网格暂时锁定';
    ui.toolStatusLine.textContent = text;
    const b = selectionBounds(state.selection.cells);
    ui.selectionSummary.textContent = b
      ? `当前选区：${b.x1 - b.x0 + 1}×${b.y1 - b.y0 + 1}×${b.z1 - b.z0 + 1} · cells=${b.count} · 范围=(${b.x0},${b.y0},${b.z0})~(${b.x1},${b.y1},${b.z1})`
      : `当前选区：无 · 基准层 L=${state.currentLayer} · 当前层蓝色高亮 / 上层正常 / 下层灰显`;
  }

  function updateHoverFromEvent(e, source) {
    state.previewPointer = { x: e.clientX, y: e.clientY };
    const pick = previewPickFromClient(e.clientX, e.clientY);
    state.hoverCell = pick && pick.type !== 'miss' ? pick : null;
    logHoverChange(pick, source);
  }
  function setCurrentLayer(next, reason) {
    const prev = state.currentLayer;
    state.currentLayer = Math.max(0, Math.min(256, next));
    ui.currentLayer.value = String(state.currentLayer);
    if (prev !== state.currentLayer) {
      detailEditorLog(`layer:set from=${prev} to=${state.currentLayer} reason=${reason}`);
      state.hoverCell = null; lastHoverSignature = '';
      clearSelectionState(`layer-change:${reason}`);
      rerender();
    }
  }

  function resetEmptyPrefab() {
    const ident = defaultPrefabIdentity();
    state.id = ident.id; state.name = ident.name; state.kind = 'custom'; state.asset = ''; state.base = '#c7b0df'; state.renderMode = 'voxel'; state.sidebarStep = 'image'; state.interactionMode = 'sprite'; releaseCurrentSpriteObjectUrl(); state.sprite = { image: '', imageExport: '', objectUrl: '', fileName: '', scale: 1, offsetX: 0, offsetY: 0, previewOpacity: 1 }; resetSpriteFitRuntime(); clearEditorSpriteImageCache(); scheduleJsonPreviewUpdate(true);
    state.anchor = { x: 0, y: 0, z: 0 }; state.gridW = 10; state.gridH = 10; state.currentLayer = 0; state.previewScale = 1;
    state.voxels = new Map(); state.tool = 'single'; state.hoverCell = null; state.previewPointer = null;
    clearSelectionState('reset-empty-prefab');
    syncStateToForm(); applySidebarStepUi(); updateInteractionModeUi(); setStatus('已新建空 Prefab'); detailEditorLog(`prefab:new id=${state.id} name=${JSON.stringify(state.name)}`); rerender();
  }
  function loadPrefabObject(obj, msg) {
    state.id = String(obj.id || 'imported_prefab');
    state.name = String(obj.name || obj.id || 'Imported Prefab');
    state.kind = String(obj.kind || 'custom');
    state.asset = String(obj.asset || '');
    state.base = String(obj.base || '#c7b0df');
    state.renderMode = String((obj.sprite && obj.sprite.image) ? (obj.renderMode || 'sprite_proxy') : 'voxel');
    releaseCurrentSpriteObjectUrl();
    state.sprite = {
      image: String(obj.sprite && obj.sprite.image || ''),
      imageExport: String(obj.sprite && obj.sprite.image || ''),
      objectUrl: '',
      fileName: String(obj.sprite && (obj.sprite.fileName || obj.sprite.name) || ''),
      scale: Math.max(0.1, Math.min(8, Number(obj.sprite && obj.sprite.scale) || 1)),
      offsetX: Number(obj.sprite && obj.sprite.offsetPx && obj.sprite.offsetPx.x) || 0,
      offsetY: Number(obj.sprite && obj.sprite.offsetPx && obj.sprite.offsetPx.y) || 0,
      previewOpacity: Math.max(0.05, Math.min(1, Number(obj.sprite && (obj.sprite.previewOpacity ?? obj.sprite.opacity)) || 1)),
    };
    resetSpriteFitRuntime();
    resetSpriteExportPromise();
    if (state.sprite.image) ensureEditorSpriteImage(state.sprite.image); else clearEditorSpriteImageCache();
    state.anchor = { x: Number(obj.anchor?.x) || 0, y: Number(obj.anchor?.y) || 0, z: Number(obj.anchor?.z) || 0 };
    state.previewScale = 1; state.currentLayer = 0; state.voxels = new Map();
    let maxX = 0, maxY = 0;
    for (const v of (obj.voxels || [])) {
      const x = Number(v.x) || 0, y = Number(v.y) || 0, z = Number(v.z) || 0;
      state.voxels.set(vkey(x, y, z), { solid: v.solid !== false, collidable: v.collidable !== false });
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    state.gridW = Math.max(4, Math.min(64, maxX + 3)); state.gridH = Math.max(4, Math.min(64, maxY + 3)); state.tool = 'single'; state.sidebarStep = state.sprite.image ? 'image' : 'voxel'; state.interactionMode = state.sprite.image ? 'sprite' : 'voxel';
    clearSelectionState('load-prefab'); syncStateToForm(); applySidebarStepUi(); updateInteractionModeUi(); setStatus(msg || `已载入 ${state.name}`); detailEditorLog(`prefab:load id=${state.id} voxels=${state.voxels.size}`); rerender();
  }

  function isServerMode() { return /^https?:$/i.test(window.location.protocol); }
  function preferredPrefabFilename(prefab) {
    const primary = String(prefab.name || '').trim(); const fallback = String(prefab.id || '').trim();
    return `${(primary || fallback || 'prefab')}.json`;
  }
  async function saveToAssetFolder() {
    const prefab = await createPrefabObjectForExport();
    if (!isServerMode()) {
      setStatus('当前不是本地服务器模式，无法直接写入 assets/prefabs，请用 start_editor.bat 启动。', false);
      detailEditorLog('asset-save: skipped not-server-mode'); return false;
    }
    try {
      const res = await fetch('/api/prefabs/save', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: preferredPrefabFilename(prefab), prefab }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setStatus(`已保存到 ${data.path}`); detailEditorLog(`asset-save: ok file=${data.file} voxels=${prefab.voxels.length}`); return true;
    } catch (err) {
      setStatus(`保存到 assets 失败：${err?.message || err}`, false); detailEditorLog(`asset-save:error ${err?.message || err}`); return false;
    }
  }
  async function saveToLibrary() {
    const ok = await saveToAssetFolder(); if (ok) return;
    try {
      const prefab = await createPrefabObjectForExport();
      const raw = localStorage.getItem(STORAGE_KEY); const arr = raw ? JSON.parse(raw) : []; const list = Array.isArray(arr) ? arr : [];
      const idx = list.findIndex(p => p && p.id === prefab.id); if (idx >= 0) list[idx] = prefab; else list.push(prefab);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); setStatus(`已退回保存到浏览器 Prefab 库：${prefab.id}`); detailEditorLog(`library:save-fallback id=${prefab.id} voxels=${prefab.voxels.length}`);
    } catch (err) { setStatus(`保存失败：${err?.message || err}`, false); detailEditorLog(`library:save-fallback:error ${err?.message || err}`); }
  }
  function downloadJson() {
    const prefab = createPrefabObject();
    const blob = new Blob([JSON.stringify(prefab, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = preferredPrefabFilename(prefab);
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0);
    setStatus(`已下载 ${a.download}`); detailEditorLog(`prefab:download file=${a.download} voxels=${prefab.voxels.length}`);
  }
  function exportEditorLogs() {
    const entry = getEditorEntryInfo();
    const snapshot = {
      build: BUILD_VERSION, lastEvent, currentLayer: state.currentLayer, tool: state.tool, grid: { w: state.gridW, h: state.gridH },
      hoverCell: state.hoverCell ? { type: state.hoverCell.type, x: state.hoverCell.x, y: state.hoverCell.y, z: state.hoverCell.z } : null,
      selection: { kind: state.selection.kind, cells: state.selection.cells.length, stage: state.selection.stage, height: state.selection.height, start: state.selection.start, end: state.selection.end },
      previewMetrics: state._previewMetrics, gridMetrics: state._gridMetrics,
      previewRect: previewCanvas ? previewCanvas.getBoundingClientRect().toJSON?.() || { x: previewCanvas.getBoundingClientRect().x, y: previewCanvas.getBoundingClientRect().y, width: previewCanvas.getBoundingClientRect().width, height: previewCanvas.getBoundingClientRect().height } : null,
    };
    pushEditorLog(`export:begin build=${BUILD_VERSION} logs=${editorLogs.length}`); pushEditorLog(`export:snapshot ${JSON.stringify(snapshot)}`);
    const header = ['# editor debug log', '# exportedAt=' + new Date().toISOString(), '# entryKind=' + entry.kind, '# entryLabel=' + entry.label, '# entryFile=' + entry.entryFile, '# launcher=' + entry.launcherHint, '# build=' + entry.build, entry.href ? ('# href=' + entry.href) : '', ''].filter(Boolean).join('\n');
    const blob = new Blob([header + editorLogs.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `editor-debug-log-${Date.now()}.txt`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 0); setStatus(`已导出日志 ${a.download}`);
  }
  window.__editorExportLogs = exportEditorLogs;

  const __entry = getEditorEntryInfo();
  pushEditorLog(`editor-entry-info kind=${__entry.kind} label=${__entry.label} entry=${__entry.entryFile} launcher=${__entry.launcherHint} build=${__entry.build}`);
  if (__entry.href) pushEditorLog(`editor-entry-info href=${__entry.href}`);

  let rerenderQueued = false;
  function rerenderNow() {
    rerenderQueued = false;
    syncStateToForm();
    drawGridTopdown();
    drawPreviewScene();
    updateSummaryPanels();
    scheduleJsonPreviewUpdate(false);
    updateToolUi();
    updateInteractionModeUi();
  }
  function rerender() {
    if (rerenderQueued) return;
    rerenderQueued = true;
    requestAnimationFrame(rerenderNow);
  }
  function writeBuiltInPrefabsHint() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY); const arr = raw ? JSON.parse(raw) : [];
      if (Array.isArray(arr) && arr.length) { setStatus(`浏览器 Prefab 库中已有 ${arr.length} 个自定义 prefab`); detailEditorLog(`library:summary count=${arr.length}`); }
    } catch {}
  }

  // left grid: still direct edit current layer for fine edits
  gridCanvas.addEventListener('mousedown', (e) => {
    lastEvent = `grid:mousedown:${e.button}`;
    if (isSpriteInteractionMode()) { detailEditorLog('grid:mousedown blocked interactionMode=sprite'); setStatus('当前是图片模式：左侧 voxel 网格已锁定', false); return; }
    const cell = gridCellFromMouse(e); if (!cell) { detailEditorLog('grid:mousedown miss'); return; }
    detailEditorLog(`grid:mousedown button=${e.button} cell=(${cell.x},${cell.y},${cell.z})`);
    if (e.button === 2) { removeVoxel(cell.x, cell.y, cell.z); rerender(); return; }
    if (hasVoxel(cell.x, cell.y, cell.z)) removeVoxel(cell.x, cell.y, cell.z); else setVoxel(cell.x, cell.y, cell.z);
    rerender();
  });
  gridCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

  previewCanvas.addEventListener('pointerdown', (e) => {
    detailEditorLog(`preview:pointerdown button=${e.button} pointerType=${e.pointerType} client=(${Math.round(e.clientX)},${Math.round(e.clientY)}) target=${safeTargetLabel(e.target)}`);
  });
  document.addEventListener('mousedown', (e) => {
    const rect = previewCanvas.getBoundingClientRect();
    const inPreview = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (inPreview) detailEditorLog(`doc:mousedown:capture button=${e.button} client=(${Math.round(e.clientX)},${Math.round(e.clientY)}) target=${safeTargetLabel(e.target)} top=${safeTargetLabel(document.elementFromPoint(e.clientX, e.clientY))}`);
  }, true);


window.addEventListener('mouseup', (e) => {
  if (state.spriteDrag.active) {
    state.spriteDrag.active = false;
    detailEditorLog(`sprite:drag-end button=${e.button} offset=(${state.sprite.offsetX || 0},${state.sprite.offsetY || 0})`);
    setStatus(`图片模式：图片偏移已更新为 (${state.sprite.offsetX || 0}, ${state.sprite.offsetY || 0})`);
    updatePreviewCanvasCursor();
    rerender();
  }
  if (state.spriteResize.active) {
    state.spriteResize.active = false;
    detailEditorLog(`sprite:resize-end button=${e.button} scale=${(state.sprite.scale || 1).toFixed(2)}`);
    setStatus(`图片模式：sprite.scale 已更新为 ${(state.sprite.scale || 1).toFixed(2)}`);
    updatePreviewCanvasCursor();
    rerender();
  }
});

  previewCanvas.addEventListener('mousemove', (e) => {
    lastEvent = 'preview:mousemove';
    if (state.spriteDrag.active && isSpriteInteractionMode()) {
      const dx = e.clientX - state.spriteDrag.startClientX;
      const dy = e.clientY - state.spriteDrag.startClientY;
      if (!state.spriteFit.lockHorizontal) state.sprite.offsetX = Math.round(state.spriteDrag.startOffsetX + dx / (state.spriteDrag.pixelScale || 1));
      state.sprite.offsetY = Math.round(state.spriteDrag.startOffsetY + dy / (state.spriteDrag.pixelScale || 1));
      updatePreviewCanvasCursor(e.clientX, e.clientY);
      rerender();
      return;
    }
    if (state.spriteResize.active && isSpriteInteractionMode()) {
      const dx = e.clientX - state.spriteResize.startClientX;
      const dy = e.clientY - state.spriteResize.startClientY;
      const delta = Math.max(dx, dy);
      const base = Math.max(32, Math.max(state.spriteResize.startDrawW, state.spriteResize.startDrawH));
      state.sprite.scale = Math.max(0.1, Math.min(8, state.spriteResize.startScale * (1 + delta / base)));
      invalidateEditorSpriteRenderCache();
      updatePreviewCanvasCursor(e.clientX, e.clientY);
      rerender();
      return;
    }
    updatePreviewCanvasCursor(e.clientX, e.clientY);
    updateHoverFromEvent(e, 'preview:mousemove'); if (state.tool === 'box' && state.selection.stage === 'box-height') adjustBoxHeightFromClientY(e.clientY); rerender();
  });
  previewCanvas.addEventListener('mouseleave', () => {
    lastEvent = 'preview:mouseleave'; if (!state.spriteDrag.active && !state.spriteResize.active) { state.previewPointer = null; state.hoverCell = null; lastHoverSignature = ''; } detailEditorLog('preview:mouseleave'); updatePreviewCanvasCursor(); rerender();
  });
  previewCanvas.addEventListener('mousedown', (e) => {
    lastEvent = `preview:mousedown:${e.button}`;
    detailEditorLog(`preview:mousedown:start button=${e.button} tool=${state.tool} client=(${Math.round(e.clientX)},${Math.round(e.clientY)}) target=${safeTargetLabel(e.target)}`);
    const pick = previewPickFromClient(e.clientX, e.clientY);
    if (isSpriteInteractionMode()) {
      if (e.button === 0) {
        const hit = spriteHitFromClient(e.clientX, e.clientY);
        if (state.spriteFit.pickSampleActive && hit) {
          setSpriteSampleFromPreviewClient(e.clientX, e.clientY, { autoFit: true });
          updatePreviewCanvasCursor(e.clientX, e.clientY);
          rerender();
          return;
        }
        const handle = spriteResizeHandleFromClient(e.clientX, e.clientY);
        if (handle) {
          state.spriteResize = { active: true, startClientX: e.clientX, startClientY: e.clientY, startScale: state.sprite.scale || 1, startDrawW: handle.drawW, startDrawH: handle.drawH };
          detailEditorLog(`sprite:resize-start scale=${(state.sprite.scale || 1).toFixed(2)} draw=(${handle.drawW}x${handle.drawH})`);
          setStatus('图片模式：拖拽右下角缩放手柄，可缩放图片');
          updatePreviewCanvasCursor(e.clientX, e.clientY);
          rerender();
          return;
        }
        if (hit) {
          state.spriteDrag = { active: true, startClientX: e.clientX, startClientY: e.clientY, startOffsetX: state.sprite.offsetX || 0, startOffsetY: state.sprite.offsetY || 0, pixelScale: hit.pixelScale || 1 };
          detailEditorLog(`sprite:drag-start offset=(${state.sprite.offsetX || 0},${state.sprite.offsetY || 0}) local=(${hit.localX.toFixed(1)},${hit.localY.toFixed(1)}) scale=${(state.sprite.scale || 1).toFixed(2)}`);
          setStatus(state.spriteFit.lockHorizontal ? '图片模式：已锁定水平拖拽，现在只会改 offsetY' : '图片模式：拖拽中，可移动图片位置');
          updatePreviewCanvasCursor(e.clientX, e.clientY);
          rerender();
          return;
        }
      }
      setStatus(state.spriteFit.pickSampleActive ? '图片模式：请点击图片本体来指定参考高度并自动适配' : '图片模式：请拖拽图片本体移动；拖拽右下角手柄缩放；Ctrl+滚轮也可缩放', false);
      rerender();
      return;
    }
    if (pick.type === 'miss') {
      detailEditorLog(`preview:mousedown:miss local=(${pick.localX.toFixed(1)},${pick.localY.toFixed(1)}) layer=${state.currentLayer}`);
      if (e.button === 0 && state.tool === 'box' && state.selection.stage === 'box-height') {
        confirmCurrentBoxSelection('click-miss');
        return;
      }
      state.hoverCell = null; rerender(); return;
    }
    detailEditorLog(`preview:mousedown:resolved pick=${pick.type} cell=(${pick.x},${pick.y},${pick.z}) occupied=${pick.occupied}`);
    state.hoverCell = pick;
    if (e.button === 2) { applyPreviewSecondaryAction(); return; }
    applyPreviewPrimaryAction(pick, e);
  });
  previewCanvas.addEventListener('wheel', (e) => {
    lastEvent = 'preview:wheel';
    const delta = e.deltaY < 0 ? 1 : -1; // wheel up => go up a layer
    detailEditorLog(`preview:wheel deltaY=${e.deltaY.toFixed(2)} layerDelta=${delta} tool=${state.tool} stage=${state.selection.stage} cameraPlane=0 currentLayer=${state.currentLayer} interaction=${state.interactionMode}`);
    if (isSpriteInteractionMode() && state.sprite.image && (e.ctrlKey || e.metaKey)) {
      state.sprite.scale = Math.max(0.1, Math.min(8, (Number(state.sprite.scale) || 1) + delta * 0.05));
      invalidateEditorSpriteRenderCache();
      detailEditorLog(`sprite:scale-wheel scale=${state.sprite.scale.toFixed(2)}`);
      setStatus(`图片模式：sprite.scale=${state.sprite.scale.toFixed(2)}`);
      rerender(); e.preventDefault(); return;
    }
    if (state.tool === 'box' && state.selection.stage === 'box-height' && e.shiftKey && !isSpriteInteractionMode()) {
      state.selection.height = Math.max(1, state.selection.height + delta);
      detailEditorLog(`box:height:wheel shift=true height=${state.selection.height}`);
      updateToolUi(); rerender(); e.preventDefault(); return;
    }
    setCurrentLayer(state.currentLayer + delta, 'preview-wheel'); e.preventDefault();
  }, { passive: false });
  previewCanvas.addEventListener('contextmenu', (e) => { detailEditorLog(`preview:contextmenu target=${safeTargetLabel(e.target)}`); e.preventDefault(); });

  const formInputs = [ui.prefabId, ui.prefabName, ui.prefabKind, ui.prefabAsset, ui.prefabBase, ui.renderMode, ui.spriteImageName, ui.spriteScale, ui.spriteOffsetX, ui.spriteOffsetY, ui.footprintCols, ui.footprintRows, ui.spriteSampleBand, ui.spriteFitMode, ui.spriteSampleYPercent, ui.anchorX, ui.anchorY, ui.anchorZ, ui.editorGridW, ui.editorGridH, ui.previewScale, ui.spritePreviewOpacityNumber];
  formInputs.forEach((el) => el && el.addEventListener('input', () => { lastEvent = `input:${el.id}`; detailEditorLog(`form:input id=${el.id} value=${el.value}`); syncFormToState(); if (['spriteScale','spriteOffsetX','spriteOffsetY','previewScale','renderMode'].includes(el.id)) invalidateEditorSpriteRenderCache(); rerender(); }));
  ui.currentLayer.addEventListener('input', () => { lastEvent = 'input:currentLayer'; setCurrentLayer(Number(ui.currentLayer.value) || 0, 'manual-input'); });

  ui.layerDown.addEventListener('click', () => { lastEvent = 'button:layerDown'; setCurrentLayer(state.currentLayer - 1, 'button-layerDown'); });
  ui.layerUp.addEventListener('click', () => { lastEvent = 'button:layerUp'; setCurrentLayer(state.currentLayer + 1, 'button-layerUp'); });
  ui.clearLayer.addEventListener('click', () => {
    lastEvent = 'button:clearLayer'; if (isSpriteInteractionMode()) { setStatus('当前是图片模式，不能清空当前层 voxel', false); return; } let removed = 0;
    for (const key of Array.from(state.voxels.keys())) if (parseKey(key).z === state.currentLayer) { state.voxels.delete(key); removed += 1; }
    detailEditorLog(`layer:clear z=${state.currentLayer} removed=${removed}`); setStatus(`已清空第 ${state.currentLayer} 层，共删除 ${removed} 个 voxel`); rerender();
  });


if (ui.spritePreviewOpacity) {
  const onOpacityRange = () => { lastEvent = 'input:spritePreviewOpacity'; applySpritePreviewOpacity(ui.spritePreviewOpacity.value, 'range'); rerender(); };
  ui.spritePreviewOpacity.addEventListener('input', onOpacityRange);
  ui.spritePreviewOpacity.addEventListener('change', onOpacityRange);
}
if (ui.spritePreviewOpacityNumber) {
  const onOpacityNumber = () => { lastEvent = 'input:spritePreviewOpacityNumber'; applySpritePreviewOpacity(ui.spritePreviewOpacityNumber.value, 'number'); rerender(); };
  ui.spritePreviewOpacityNumber.addEventListener('input', onOpacityNumber);
  ui.spritePreviewOpacityNumber.addEventListener('change', onOpacityNumber);
}

  if (ui.swapFootprint) ui.swapFootprint.addEventListener('click', () => {
    lastEvent = 'button:swapFootprint';
    const nextCols = sanitizeFootprintValue(state.spriteFit.footprintRows);
    state.spriteFit.footprintRows = sanitizeFootprintValue(state.spriteFit.footprintCols);
    state.spriteFit.footprintCols = nextCols;
    syncStateToForm();
    setStatus(`已交换 footprint 为 ${state.spriteFit.footprintCols}×${state.spriteFit.footprintRows}`);
    rerender();
  });
  if (ui.applySelectionFootprint) ui.applySelectionFootprint.addEventListener('click', () => {
    lastEvent = 'button:applySelectionFootprint';
    applySelectionFootprintFromCurrentSelection();
  });
  if (ui.autoFitSpriteFootprint) ui.autoFitSpriteFootprint.addEventListener('click', () => {
    lastEvent = 'button:autoFitSpriteFootprint';
    applyAutoFitSpriteFootprint('button');
  });
  if (ui.pickSpriteSampleLine) ui.pickSpriteSampleLine.addEventListener('click', () => {
    lastEvent = 'button:pickSpriteSampleLine';
    state.spriteFit.pickSampleActive = !state.spriteFit.pickSampleActive;
    if (state.spriteFit.pickSampleActive) {
      state.spriteFit.detectionMode = 'sample-band';
      syncStateToForm();
      setInteractionMode('sprite', 'pick-sprite-sample');
      setStatus('已进入取样模式：请在右侧预览图上点击图片本体，按该高度自动适配左右边界');
    } else {
      syncStateToForm();
      setStatus('已退出取样模式');
      rerender();
    }
  });
  if (ui.toggleSpriteFitGuides) ui.toggleSpriteFitGuides.addEventListener('click', () => {
    lastEvent = 'button:toggleSpriteFitGuides';
    state.spriteFit.guidesVisible = !state.spriteFit.guidesVisible;
    syncStateToForm();
    rerender();
  });
  if (ui.toggleSpriteLockX) ui.toggleSpriteLockX.addEventListener('click', () => {
    lastEvent = 'button:toggleSpriteLockX';
    state.spriteFit.lockHorizontal = !state.spriteFit.lockHorizontal;
    syncStateToForm();
    rerender();
  });

  ui.toolPaint.addEventListener('click', () => { lastEvent = 'button:toolSingle'; state.tool = 'single'; clearSelectionState('switch-tool-single'); rerender(); });
  ui.toolErase.addEventListener('click', () => { lastEvent = 'button:clearSelectionTool'; clearSelectionState('button-clear-selection'); setStatus('已清空当前选区'); rerender(); });
  ui.toolRect.addEventListener('click', () => { lastEvent = 'button:toolRect'; state.tool = 'rect'; clearSelectionState('switch-tool-rect'); rerender(); });
  ui.toolVolume.addEventListener('click', () => { lastEvent = 'button:toolBox'; state.tool = 'box'; clearSelectionState('switch-tool-box'); rerender(); });
  ui.applyFillSelection.addEventListener('click', () => { lastEvent = 'button:fillSelection'; commitFillSelection(); });
  ui.applyDeleteSelection.addEventListener('click', () => { lastEvent = 'button:deleteSelection'; commitDeleteSelection(); });
  ui.clearSelection.addEventListener('click', () => { lastEvent = 'button:clearSelection'; clearSelectionState('button-clear-selection'); setStatus('已清空当前选区'); rerender(); });

  ui.newPrefab.addEventListener('click', () => { lastEvent = 'button:newPrefab'; resetEmptyPrefab(); });
  ui.clearAll.addEventListener('click', () => { lastEvent = 'button:clearAll'; if (isSpriteInteractionMode()) { setStatus('当前是图片模式，不能清空全部 voxel', false); return; } const total = state.voxels.size; state.voxels.clear(); clearSelectionState('clear-all'); detailEditorLog(`prefab:clearAll removed=${total}`); setStatus(`已清空全部体素，共删除 ${total} 个`); rerender(); });

  ui.importSpriteImage.addEventListener('click', () => { lastEvent = 'button:importSprite'; ui.spriteImageFile.click(); });
  ui.clearSpriteImage.addEventListener('click', () => {
    lastEvent = 'button:clearSprite';
    releaseCurrentSpriteObjectUrl();
    state.sprite = { image: '', imageExport: '', objectUrl: '', fileName: '', scale: state.sprite.scale || 1, offsetX: 0, offsetY: 0, previewOpacity: 1 };
    resetSpriteFitRuntime({ preserveGuides: true, preserveLock: true });
    if (ui.spriteImageName) ui.spriteImageName.value = '';
    clearEditorSpriteImageCache();
    updateSpriteThumb();
    scheduleJsonPreviewUpdate(true);
    setStatus('已清除 prefab 图片');
    rerender();
  });
  ui.spriteImageFile.addEventListener('change', async () => {
    lastEvent = 'input:spriteImageFile';
    const file = ui.spriteImageFile.files && ui.spriteImageFile.files[0];
    if (!file) return;
    try {
      releaseCurrentSpriteObjectUrl();
      const objectUrl = URL.createObjectURL(file);
      state.sprite.image = objectUrl;
      state.sprite.imageExport = '';
      state.sprite.objectUrl = objectUrl;
      state.sprite.fileName = file.name;
      if (ui.spriteImageName) ui.spriteImageName.value = file.name;
      if (!ui.renderMode.value || ui.renderMode.value === 'voxel') { ui.renderMode.value = 'sprite_proxy'; state.renderMode = 'sprite_proxy'; }
      ensureEditorSpriteImage(objectUrl);
      resetSpriteFitRuntime({ preserveGuides: true, preserveLock: true });
      updateSpriteThumb();
      state.sidebarStep = 'image';
      state.interactionMode = 'sprite';
      applySidebarStepUi();
      invalidateEditorSpriteRenderCache();
      spriteExportDataUrlPromise = readFileAsDataURL(file).then((dataUrl) => {
        if (state.sprite.objectUrl !== objectUrl) return state.sprite.imageExport || '';
        state.sprite.imageExport = dataUrl;
        detailEditorLog(`sprite:embed-ready file=${file.name} chars=${dataUrl.length}`);
        scheduleJsonPreviewUpdate(false);
        return dataUrl;
      }).catch((err) => {
        detailEditorLog(`sprite:embed-error ${err?.message || err}`);
        throw err;
      });
      detailEditorLog(`sprite:import file=${file.name} bytes=${file.size}`);
      setStatus(`已导入图片 ${file.name}，并切换到图片模式`);
      rerender();
    } catch (err) {
      setStatus(`导入图片失败：${err?.message || err}`, false);
      detailEditorLog(`sprite:import-error ${err?.message || err}`);
    } finally {
      ui.spriteImageFile.value = '';
    }
  });
  ui.loadSampleStair.addEventListener('click', () => { lastEvent = 'button:loadStair'; loadPrefabObject(samples.stair, '已载入阶梯示例'); });
  ui.loadSampleT.addEventListener('click', () => { lastEvent = 'button:loadT'; loadPrefabObject(samples.tshape, '已载入 T 形示例'); });
  ui.saveLibrary.addEventListener('click', async () => { lastEvent = 'button:saveLibrary'; await saveToLibrary(); });
  ui.downloadJson.addEventListener('click', async () => { lastEvent = 'button:downloadJson'; await downloadJson(); });
  ui.importJson.addEventListener('click', () => { lastEvent = 'button:importJson'; ui.importFile.click(); });
  ui.importFile.addEventListener('change', async () => {
    const file = ui.importFile.files && ui.importFile.files[0]; if (!file) return; lastEvent = 'file:import'; detailEditorLog(`import:file name=${file.name} size=${file.size}`);
    try { const text = await file.text(); const data = JSON.parse(text); loadPrefabObject(data, `已导入 ${file.name}`); }
    catch (err) { setStatus(`导入失败：${err?.message || err}`, false); detailEditorLog(`import:error ${err?.message || err}`); }
    finally { ui.importFile.value = ''; }
  });
  ui.openMain.addEventListener('click', () => { lastEvent = 'button:openMain'; window.location.href = `index.html?fromEditor=1&t=${Date.now()}`; });
  ui.exportEditorLogs.addEventListener('click', () => { lastEvent = 'button:exportLogs'; detailEditorLog(`button:exportLogs typeofLocal=${typeof exportEditorLogs} typeofGlobal=${typeof window.__editorExportLogs}`); exportEditorLogs(); });
  ui.clearEditorLogs.addEventListener('click', () => { lastEvent = 'button:clearLogs'; clearEditorLogs(); });

  window.addEventListener('keydown', (e) => {
    if (e.target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (e.key === '1') { lastEvent = 'kbd:1'; state.tool = 'single'; clearSelectionState('kbd-1'); rerender(); return; }
    if (e.key === '2') { lastEvent = 'kbd:2'; clearSelectionState('kbd-2-clear'); setStatus('已清空当前选区'); rerender(); return; }
    if (e.key === '3') { lastEvent = 'kbd:3'; state.tool = 'rect'; clearSelectionState('kbd-3'); rerender(); return; }
    if (e.key === '4') { lastEvent = 'kbd:4'; state.tool = 'box'; clearSelectionState('kbd-4'); rerender(); return; }
    if (e.key === 'Escape') { lastEvent = 'kbd:Escape'; clearSelectionState('kbd-escape'); setStatus('已取消当前选区流程'); rerender(); return; }
    if (e.key === 'Enter' && state.tool === 'box' && state.selection.stage === 'box-height') {
      lastEvent = 'kbd:Enter';
      confirmCurrentBoxSelection('enter');
      return;
    }
    if (e.key === 'Enter' && state.selection.cells.length) { lastEvent = 'kbd:Enter-fill'; commitFillSelection(); return; }
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selection.cells.length) { lastEvent = 'kbd:Delete'; commitDeleteSelection(); return; }
    if (e.key.toLowerCase() === 'i') { lastEvent = 'kbd:i'; setInteractionMode('sprite', 'kbd-i'); return; }
    if (e.key.toLowerCase() === 'v') { lastEvent = 'kbd:v'; setInteractionMode('voxel', 'kbd-v'); return; }
    if (e.key === '[') { lastEvent = 'kbd:['; setCurrentLayer(state.currentLayer - 1, 'kbd-bracket'); return; }
    if (e.key === ']') { lastEvent = 'kbd:]'; setCurrentLayer(state.currentLayer + 1, 'kbd-bracket'); return; }
  });

  window.addEventListener('error', (event) => { pushEditorLog(`[editor-error] message=${event.message || 'unknown'} source=${event.filename || 'n/a'} line=${event.lineno || 0} col=${event.colno || 0} lastEvent=${lastEvent} tool=${state.tool} layer=${state.currentLayer} voxels=${state.voxels.size}`); });
  window.addEventListener('unhandledrejection', (event) => { const reason = event.reason && (event.reason.stack || event.reason.message) ? (event.reason.stack || event.reason.message) : String(event.reason); pushEditorLog(`[editor-rejection] reason=${reason} lastEvent=${lastEvent} tool=${state.tool} layer=${state.currentLayer} voxels=${state.voxels.size}`); });
  window.addEventListener('resize', () => { lastEvent = 'window:resize'; detailEditorLog('window:resize'); rerender(); });

  pushEditorLog(`editor:boot build=${BUILD_VERSION}`);
  pushEditorLog(`editor:dom grid=${!!gridCanvas} preview=${!!previewCanvas} exportBtn=${!!ui.exportEditorLogs}`);
  logReady = true;
  bindSidebarStepTabs();
  resetEmptyPrefab();
  pushEditorLog(`editor:ready build=${BUILD_VERSION}`);
  writeBuiltInPrefabsHint();
  if (isServerMode()) pushEditorLog('editor:server-mode assets/prefabs enabled');
})();
