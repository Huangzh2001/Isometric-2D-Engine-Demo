const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const logging = fs.readFileSync(path.join(root, 'src/infrastructure/logging/logging.js'), 'utf8');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
const scope = fs.readFileSync(path.join(root, 'src/presentation/render/projection/render-scope-builder.js'), 'utf8');
const logic = fs.readFileSync(path.join(root, 'src/presentation/render/logic.js'), 'utf8');
[
  '# dynamicSpriteCameraCulling=',
  '# lightingRadius=',
  '# habboDebugOverlayEnabled='
].forEach((field) => {
  assert(logging.includes(field), `source log export should include ${field}`);
  assert(main1.includes(field), `runtime bundle log export should include ${field}`);
});
assert(scope.includes('__DYNAMIC_SPRITE_CAMERA_CULLING_LAST__'), 'camera culling owner should publish its last decision snapshot');
assert(logic.includes('function getLightingRadiusDiagnosticsSnapshot()'), 'lighting owner should expose zoom-invariant radius diagnostics');
console.log('PASS debug-export-regression-fields');

assert(logging.includes('# canvasDebugTextEnabled='), 'source log export should record the master debug-text state');
assert(logging.includes('# pixiPlayerChunkDebugOverlayEnabled='), 'source log export should record the green Pixi overlay state');
assert(logging.includes('# habboFinalPlacementFix='), 'source log export should include final placement diagnostics');
assert(main2.includes('HZH-HABBO-FINAL-PLACEMENT-DIAGNOSTICS-V3'), 'runtime bundle should append final placement diagnostics');
