const assert = require('assert');
const fs = require('fs');
const path = require('path');

function collectJsFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectJsFiles(full, out);
    else if (entry.isFile() && full.endsWith('.js')) out.push(full);
  }
  return out;
}

const renderSource = fs.readFileSync('src/presentation/render/render.js', 'utf8');
const jsFiles = collectJsFiles('src');
const nakedCallFiles = jsFiles.filter((file) => fs.readFileSync(file, 'utf8').includes('getMainEditorViewRotationValue'));

assert.deepStrictEqual(nakedCallFiles, [], 'src must not contain naked getMainEditorViewRotationValue calls');
assert(renderSource.includes('function getSafeMainEditorViewRotation(snapshot)'), 'renderer must define safe viewRotation resolver');
assert(renderSource.includes('fallbackUsed: true'), 'safe resolver must fallback when no viewRotation exists');
assert(renderSource.includes('viewRotation: 0'), 'safe resolver fallback viewRotation must be 0');
assert(renderSource.includes('logRenderDependency'), 'renderer must log render dependency evidence');
assert(renderSource.includes("logRenderDependency('main-editor-view-rotation'"), 'drawPlacementPreview must log main editor viewRotation dependency');
assert(renderSource.includes('buildDebugPreviewFaceRenderables({'), 'debug face renderables must be built with explicit argument object');
assert(renderSource.includes('viewRotationInfo: viewRotationInfo'), 'viewRotation dependency must be explicitly passed into debug face rendering');
assert(renderSource.includes('viewRotation: viewRotation'), 'face renderables must receive explicit viewRotation value');
assert(!renderSource.includes('viewRotation: getMainEditorViewRotationValue()'), 'renderer must not call undefined global viewRotation reader');

console.log('main-editor-view-rotation-fallback.test.js passed');
