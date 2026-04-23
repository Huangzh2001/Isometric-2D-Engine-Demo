const fs = require('fs');
const vm = require('vm');
const path = require('path');

function makeClassList() {
  const set = new Set();
  return {
    add(name) { set.add(String(name)); },
    remove(name) { set.delete(String(name)); },
    toggle(name, force) {
      name = String(name);
      if (force === undefined) {
        if (set.has(name)) { set.delete(name); return false; }
        set.add(name); return true;
      }
      if (force) set.add(name); else set.delete(name);
      return !!force;
    },
    contains(name) { return set.has(String(name)); },
    toString() { return Array.from(set).join(' '); }
  };
}

function createGradient() {
  return { addColorStop() {} };
}

function createCanvasContext() {
  const target = {
    fillStyle: '', strokeStyle: '', font: '', lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic', globalAlpha: 1,
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, closePath() {}, clip() {}, save() {}, restore() {},
    fill() {}, stroke() {}, arc() {}, fillText() {}, strokeText() {}, translate() {}, scale() {}, rotate() {}, rect() {}, measureText(text) { return { width: String(text || '').length * 8 }; },
    createLinearGradient() { return createGradient(); }, createRadialGradient() { return createGradient(); },
    drawImage() {}, quadraticCurveTo() {}, bezierCurveTo() {}, setLineDash() {}, roundRect() {}, imageSmoothingEnabled: true
  };
  return new Proxy(target, {
    get(obj, prop) {
      if (prop in obj) return obj[prop];
      obj[prop] = function () {};
      return obj[prop];
    }
  });
}

function createElement(id) {
  const listeners = {};
  const el = {
    id: id || '',
    style: {},
    dataset: {},
    children: [],
    parentNode: null,
    disabled: false,
    checked: false,
    value: '',
    textContent: '',
    files: null,
    width: 640,
    height: 360,
    className: '',
    classList: makeClassList(),
    attributes: {},
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; },
    removeChild(child) { this.children = this.children.filter((c) => c !== child); child.parentNode = null; return child; },
    setAttribute(name, value) { this.attributes[name] = String(value); if (name === 'data-floor-tool') this.dataset.floorTool = String(value); },
    getAttribute(name) { if (name === 'data-floor-tool') return this.dataset.floorTool; return this.attributes[name]; },
    addEventListener(type, fn) { (listeners[type] || (listeners[type] = [])).push(fn); },
    dispatchEvent(ev) { (listeners[ev.type] || []).forEach((fn) => fn(ev)); },
    click() { this.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {}, ctrlKey: false, metaKey: false }); },
    getBoundingClientRect() { return { left: 0, top: 0, width: this.width || 640, height: this.height || 360 }; },
    getContext() { if (!this._ctx) this._ctx = createCanvasContext(); return this._ctx; },
    focus() {}, blur() {},
    querySelectorAll() { return []; },
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return ''; },
    set() { el.children = []; }
  });
  return el;
}

function createTestEnvironment() {
  const elementMap = new Map();
  const toolButtons = ['brush-floor','brush-blocked','erase','wall','wall-erase','rect-floor','rect-blocked','rect-erase','fill-floor','fill-blocked','fill-erase'].map((tool) => {
    const btn = createElement('tool-' + tool);
    btn.dataset.floorTool = tool;
    return btn;
  });

  const requiredIds = [
    'floorEditorCanvas','floorEditorStatus','rotateLeftBtn','rotateRightBtn','currentViewDirectionLabel','rotationAnimationMsSelect',
    'floorNameInput','shapeModeSelect','floorColsInput','floorRowsInput','wallHeightInput','applyFloorMetaBtn','createRectanglePlanBtn','createCustomPlanBtn',
    'addLevelBtn','addRectLevelBtn','copyLevelBtn','removeLevelBtn','clearOverlapSelectionBtn','zoomRange','showGridToggle','showWallsToggle','showAdjacentToggle',
    'undoBtn','redoBtn','saveAutosaveBtn','loadAutosaveBtn','exportFloorBtn','importFloorBtn','exportDiagnosticLogBtn','clearAutosaveBtn','importFloorFile',
    'currentLevelTitle','currentLevelBadge','currentLevelColorChip','activeLevelText','currentLevelNameInput','currentLevelColorInput','currentLevelColsInput','currentLevelRowsInput','currentOffsetXInput','currentOffsetYInput','currentElevationGapInput','applyCurrentLevelMetaBtn','resetLevelTransformBtn','toggleOffsetHandlesBtn','toggleElevationHandlesBtn',
    'prevLevelBtn','nextLevelBtn','applyPerimeterWallsBtn','clearWallsBtn','wallBrushHeightInput','toolInfo','hoverInfo','selectionInfo','enabledCountText','blockedCountText','wallCountText','totalLevelsText','totalEnabledText','legendInfo',
    'overlapCanvas','overlapSummaryText','levelList','levelListStatus'
  ];

  requiredIds.forEach((id) => elementMap.set(id, createElement(id)));
  elementMap.get('floorEditorCanvas').width = 900; elementMap.get('floorEditorCanvas').height = 600;
  elementMap.get('overlapCanvas').width = 220; elementMap.get('overlapCanvas').height = 180;
  elementMap.get('shapeModeSelect').value = 'rectangle';
  elementMap.get('rotationAnimationMsSelect').value = '160';
  elementMap.get('zoomRange').value = '1';
  elementMap.get('showWallsToggle').checked = true;
  elementMap.get('showAdjacentToggle').checked = true;
  elementMap.get('showGridToggle').checked = false;

  const body = createElement('body');
  const documentListeners = {};
  const windowListeners = {};
  let now = 0;
  let rafId = 1;
  const rafQueue = [];

  const consoleErrors = [];
  const consoleWarns = [];
  const consoleLogs = [];
  const consoleMock = {
    log(...args) { consoleLogs.push(args); },
    warn(...args) { consoleWarns.push(args); },
    error(...args) { consoleErrors.push(args); }
  };

  const diagnostics = {
    renderCount: 0,
    renderSummaryCount: 0,
    rotationAnimationStartCount: 0,
    rotationAnimationCompleteCount: 0,
    lifecycle: [],
    latest: {},
    hitTests: [],
    captureLifecycle(name, payload) {
      this.lifecycle.push({ name, payload });
      if (name === 'rotation-animation-start') this.rotationAnimationStartCount += 1;
      if (name === 'rotation-animation-complete') this.rotationAnimationCompleteCount += 1;
    },
    captureRenderCycle(stats) { this.renderCount += 1; this.renderSummaryCount += 1; this.latest.render = stats; },
    setLatest(label, payload) { this.latest[label] = payload; },
    captureHitTest(payload) { this.hitTests.push(payload); },
    captureControllerEvent() {},
  };

  const document = {
    readyState: 'complete',
    body,
    createElement(tag) { return createElement(tag); },
    getElementById(id) { if (!elementMap.has(id)) elementMap.set(id, createElement(id)); return elementMap.get(id); },
    querySelectorAll(selector) { return selector === '[data-floor-tool]' ? toolButtons : []; },
    addEventListener(type, fn) { (documentListeners[type] || (documentListeners[type] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (documentListeners[ev.type] || []).forEach((fn) => fn(ev)); }
  };

  const storage = { storageKey: '__TEST__', saveAutosave() {}, loadAutosave() { return null; }, downloadProject() {}, readProjectFile() { return Promise.reject(new Error('not implemented')); }, clearAutosave() {} };

  const windowObj = {
    document,
    devicePixelRatio: 1,
    navigator: { userAgent: 'node-test', language: 'zh-CN' },
    location: { href: 'http://test.local/START_FLOOR_EDITOR.html' },
    __APP_NAMESPACE: { bind() {} },
    __APP_ENTRY_INFO: { kind: 'floor-editor', label: '地板编辑器', entryFile: 'START_FLOOR_EDITOR.html', build: 'test' },
    __FLOOR_EDITOR_DIAGNOSTIC_LOG__: diagnostics,
    __FLOOR_EDITOR_STORAGE__: storage,
    addEventListener(type, fn) { (windowListeners[type] || (windowListeners[type] = [])).push(fn); },
    removeEventListener() {},
    dispatchEvent(ev) { (windowListeners[ev.type] || []).forEach((fn) => fn(ev)); },
    requestAnimationFrame(fn) { const id = rafId++; rafQueue.push({ id, fn, cancelled: false }); return id; },
    cancelAnimationFrame(id) { const item = rafQueue.find((entry) => entry.id === id); if (item) item.cancelled = true; },
    performance: { now: () => now },
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    alert() {},
  };
  windowObj.window = windowObj;

  function runAnimationFrames(maxFrames = 40, stepMs = 32) {
    for (let i = 0; i < maxFrames; i += 1) {
      const tasks = rafQueue.splice(0, rafQueue.length).filter((item) => !item.cancelled);
      if (!tasks.length) break;
      now += stepMs;
      tasks.forEach((task) => task.fn(now));
    }
  }

  const context = {
    window: windowObj,
    document,
    console: consoleMock,
    performance: windowObj.performance,
    requestAnimationFrame: windowObj.requestAnimationFrame.bind(windowObj),
    cancelAnimationFrame: windowObj.cancelAnimationFrame.bind(windowObj),
    Date, JSON, Math, Number, String, Object, Array, isFinite, setTimeout, clearTimeout, parseInt, parseFloat, Blob: function Blob() {}
  };
  vm.createContext(context);

  function runFile(relPath) {
    const code = fs.readFileSync(path.join(__dirname, '..', '..', relPath), 'utf8');
    vm.runInContext(code, context, { filename: relPath });
  }

  return { context, document, window: windowObj, diagnostics, consoleErrors, consoleWarns, consoleLogs, runFile, runAnimationFrames, elementMap };
}

module.exports = { createTestEnvironment };
