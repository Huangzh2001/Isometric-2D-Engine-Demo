const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  assert(start >= 0, `${name} must exist`);
  const brace = text.indexOf('{', start);
  let depth = 0, quote = null, escaped = false;
  for (let i = brace; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error(`unterminated ${name}`);
}

function testResize(file) {
  const text = fs.readFileSync(file, 'utf8');
  const fn = extractFunction(text, 'syncPixiLayerMetrics');
  let resizeCount = 0;
  const canvas = { width: 1370, height: 1119 };
  const pixiCanvas = { width: 1370, height: 1119, style: { pointerEvents: 'none' } };
  const app = { renderer: { width: 913, height: 746, resolution: 1.5, resize() { resizeCount++; } } };
  const context = {
    state: { pixiApp: app, pixiCanvas, pixiMetricSignature: '', emptyLayerLogged: true },
    getTargetCanvas: () => canvas,
    getPixiLogicalCanvasMetrics: () => ({ logicalWidth: 913, logicalHeight: 746, backingWidth: 1370, backingHeight: 1119, backingScale: 1.5 }),
    updatePixiCanvasStyle: () => true,
    getDevicePixelRatio: () => 1.5,
    getRendererType: () => 'webgl',
    emit: () => {}, Number, Math, result: null
  };
  vm.createContext(context);
  vm.runInContext(`${fn}; for (var i=0;i<100;i++) syncPixiLayerMetrics('stable'); result=state;`, context);
  assert.strictEqual(resizeCount, 1, `${path.basename(file)} must resize once for 100 stable syncs`);
  context.getPixiLogicalCanvasMetrics = () => ({ logicalWidth: 1000, logicalHeight: 746, backingWidth: 1500, backingHeight: 1119, backingScale: 1.5 });
  vm.runInContext(`syncPixiLayerMetrics('changed')`, context);
  assert.strictEqual(resizeCount, 2, `${path.basename(file)} must resize again when dimensions actually change`);
  assert(text.includes('pixiMetricSignature'), `${path.basename(file)} must keep a stable metric signature`);
}

testResize(path.join(root, 'src/presentation/render/renderer/pixi-world-renderer.js'));
testResize(path.join(root, 'dist/bundles/main-2.bundle.js'));

const appSource = fs.readFileSync(path.join(root, 'src/presentation/shell/app.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
assert(appSource.includes('if (placementPreviewActive)'), 'placement preview must consume normal wheel for facing rotation');
assert(bundle.includes('if(placementPreviewActive){'), 'runtime bundle must rotate preview facing on normal wheel');
assert(appSource.includes("startCameraInteractionProfile('zoom')"), 'wheel path without placement preview must still enter zoom');
assert(bundle.includes("startCameraInteractionProfile('zoom')"), 'runtime bundle without placement preview must still enter zoom');
console.log('pixi-stable-resize-and-wheel-zoom.test.js: OK');
