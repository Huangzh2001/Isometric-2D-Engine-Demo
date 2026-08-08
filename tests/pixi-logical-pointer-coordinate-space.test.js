const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sourcePath = path.join(root, 'src/presentation/render/renderer/pixi-world-renderer.js');
const bundlePath = path.join(root, 'dist/bundles/main-2.bundle.js');

function extractFunction(text, name) {
  const marker = `function ${name}(`;
  const start = text.indexOf(marker);
  assert(start >= 0, `${name} must exist`);
  const brace = text.indexOf('{', start);
  assert(brace >= 0, `${name} body must exist`);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = brace; i < text.length; i += 1) {
    const ch = text[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

function runCase(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const names = [
    'getDevicePixelRatio',
    'getCanvasCssRect',
    'getPixiLogicalCanvasMetrics',
    'getPixiStageCoordinateBounds'
  ];
  const code = [
    'var state = { pixiRendererWidth: 912, pixiRendererHeight: 746 };',
    ...names.map((name) => extractFunction(text, name)),
    'result = { metrics: getPixiLogicalCanvasMetrics(canvas), bounds: getPixiStageCoordinateBounds(canvas) };'
  ].join('\n');

  const canvas = {
    width: 1370,
    height: 1119,
    clientWidth: 913,
    clientHeight: 746,
    style: { width: '913px', height: '746px' },
    getBoundingClientRect() { return { width: 912.8828125, height: 746 }; }
  };
  const context = {
    global: { devicePixelRatio: 2, VIEW_W: 913, VIEW_H: 746, dpr: 1.5 },
    canvas,
    result: null,
    Number,
    Math,
    parseFloat
  };
  vm.createContext(context);
  vm.runInContext(code, context);

  const { metrics, bounds } = context.result;
  assert.strictEqual(metrics.logicalWidth, 913, `${path.basename(filePath)} logical width`);
  assert.strictEqual(metrics.logicalHeight, 746, `${path.basename(filePath)} logical height`);
  assert.strictEqual(metrics.backingWidth, 1370, `${path.basename(filePath)} backing width`);
  assert.strictEqual(metrics.backingHeight, 1119, `${path.basename(filePath)} backing height`);
  assert(Math.abs(metrics.backingScale - 1.5) < 1e-9, `${path.basename(filePath)} backing scale`);

  assert.strictEqual(bounds.width, 913, `${path.basename(filePath)} stage width must be CSS/logical`);
  assert.strictEqual(bounds.height, 746, `${path.basename(filePath)} stage height must be CSS/logical`);
  assert.strictEqual(bounds.maxX, 913, `${path.basename(filePath)} culling maxX`);
  assert.strictEqual(bounds.maxY, 746, `${path.basename(filePath)} culling maxY`);
  assert.strictEqual(bounds.coordinateSpace, 'pixi-stage-logical-css-pixels');
  assert.notStrictEqual(bounds.width, canvas.width, 'stage must not use backing width as world width');
  assert.notStrictEqual(bounds.height, canvas.height, 'stage must not use backing height as world height');

  assert(
    text.includes('logicalMetrics.logicalWidth') && text.includes('logicalMetrics.logicalHeight'),
    `${path.basename(filePath)} resize/init must consume logical dimensions`
  );
  return { metrics, bounds };
}

const source = runCase(sourcePath);
const bundle = runCase(bundlePath);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(bundle.metrics)),
  JSON.parse(JSON.stringify(source.metrics)),
  'runtime bundle and source must agree on canvas metrics'
);
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(bundle.bounds)),
  JSON.parse(JSON.stringify(source.bounds)),
  'runtime bundle and source must agree on stage coordinate space'
);

console.log('pixi-logical-pointer-coordinate-space.test.js: OK');
