#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function indexOfOrFail(source, needle) {
  const idx = source.indexOf(needle);
  assert(idx >= 0, `missing ${needle}`);
  return idx;
}

const primitiveRel = 'src/presentation/render/renderer/canvas2d-draw-primitives.js';
const renderRel = 'src/presentation/render/render.js';
const primitiveSource = read(primitiveRel);
const renderSource = read(renderRel);
const indexSource = read('index.html');

assert(primitiveSource.includes("layer: 'presentation/render/renderer'"), 'primitive module must declare presentation/renderer layer');
assert(indexOfOrFail(indexSource, primitiveRel) < indexOfOrFail(indexSource, renderRel), 'canvas2d-draw-primitives must load before render.js');

for (const marker of [
  'requireCanvas2dDrawPrimitivesForRender().drawPolyOn',
  'requireCanvas2dDrawPrimitivesForRender().drawPolyWithOffsetOn',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromPoints',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromLoops',
  'requireCanvas2dDrawPrimitivesForRender().buildPath2DFromSegments',
  'requireCanvas2dDrawPrimitivesForRender().drawTextBadgeOn',
  'requireCanvas2dDrawPrimitivesForRender().drawMultilineBadgeOn'
]) {
  assert(renderSource.includes(marker), `render.js missing primitive delegation marker ${marker}`);
}

for (const snippet of [
  'targetCtx.beginPath();\n  targetCtx.moveTo(points[0].x, points[0].y);',
  'var path = new Path2D();\n  path.moveTo',
  "ctx.font = '10px monospace';\n  var maxW = 0;"
]) {
  assert(!renderSource.includes(snippet), `render.js still owns primitive body snippet: ${snippet}`);
}

class FakePath2D {
  constructor() { this.ops = []; }
  moveTo(x, y) { this.ops.push(['moveTo', x, y]); }
  lineTo(x, y) { this.ops.push(['lineTo', x, y]); }
  closePath() { this.ops.push(['closePath']); }
}

function createCtx() {
  const calls = [];
  const ctx = {
    calls,
    beginPath() { calls.push(['beginPath']); },
    moveTo(x, y) { calls.push(['moveTo', x, y]); },
    lineTo(x, y) { calls.push(['lineTo', x, y]); },
    closePath() { calls.push(['closePath']); },
    fill() { calls.push(['fill', this.fillStyle]); },
    stroke() { calls.push(['stroke', this.strokeStyle, this.lineWidth]); },
    save() { calls.push(['save']); },
    restore() { calls.push(['restore']); },
    fillRect(x, y, w, h) { calls.push(['fillRect', x, y, w, h]); },
    strokeRect(x, y, w, h) { calls.push(['strokeRect', x, y, w, h]); },
    fillText(text, x, y) { calls.push(['fillText', text, x, y]); },
    strokeText(text, x, y) { calls.push(['strokeText', text, x, y]); },
    measureText(text) { return { width: String(text).length * 7 }; },
    font: '',
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1
  };
  return ctx;
}

const sandbox = { console, Path2D: FakePath2D };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(primitiveSource, sandbox, { filename: primitiveRel });
const api = sandbox.IsometricCanvas2dDrawPrimitives;
assert(api, 'primitive API should be exported');

for (const name of [
  'drawPolyOn',
  'drawPolyWithOffsetOn',
  'averagePointWithOffset',
  'buildPath2DFromPoints',
  'buildPath2DFromLoops',
  'buildPath2DFromSegments',
  'drawTextBadgeOn',
  'drawMultilineBadgeOn'
]) {
  assert.strictEqual(typeof api[name], 'function', `missing API function ${name}`);
}

const ctx = createCtx();
api.drawPolyOn(ctx, [{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 6 }], '#abc', '#def', 2);
assert.deepStrictEqual(ctx.calls.slice(0, 5), [
  ['beginPath'],
  ['moveTo', 1, 2],
  ['lineTo', 3, 4],
  ['lineTo', 5, 6],
  ['closePath']
]);
assert(ctx.calls.some((call) => call[0] === 'fill' && call[1] === '#abc'), 'drawPolyOn should fill');
assert(ctx.calls.some((call) => call[0] === 'stroke' && call[1] === '#def' && call[2] === 2), 'drawPolyOn should stroke');

const shifted = createCtx();
api.drawPolyWithOffsetOn(shifted, [{ x: 1, y: 2 }, { x: 3, y: 4 }], 10, -1, null, '#000', 4);
assert.deepStrictEqual(shifted.calls.slice(0, 4), [
  ['beginPath'],
  ['moveTo', 11, 1],
  ['lineTo', 13, 3],
  ['closePath']
]);

assert.strictEqual(JSON.stringify(api.averagePointWithOffset([{ x: 0, y: 2 }, { x: 4, y: 6 }], 1, -2)), JSON.stringify({ x: 3, y: 2 }));

const pathFromPoints = api.buildPath2DFromPoints([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }]);
assert(pathFromPoints instanceof FakePath2D, 'buildPath2DFromPoints should return Path2D instance');
assert.deepStrictEqual(pathFromPoints.ops[pathFromPoints.ops.length - 1], ['closePath']);

const pathFromSegments = api.buildPath2DFromSegments([[{ x: 1, y: 2 }, { x: 3, y: 4 }]]);
assert(pathFromSegments instanceof FakePath2D, 'buildPath2DFromSegments should return Path2D instance');
assert.deepStrictEqual(pathFromSegments.ops, [['moveTo', 1, 2], ['lineTo', 3, 4]]);

const badgeCtx = createCtx();
api.drawTextBadgeOn(badgeCtx, 'A', 10, 20, '#fff', '#999');
assert(badgeCtx.calls.some((call) => call[0] === 'fillText' && call[1] === 'A'), 'drawTextBadgeOn should draw text');

console.log('PASS canvas2d-draw-primitives');
