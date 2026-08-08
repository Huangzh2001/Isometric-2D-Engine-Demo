const fs = require('fs');
const path = require('path');
function assert(condition, message) { if (!condition) throw new Error(message); }
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const main1 = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const main2 = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
const hudSource = fs.readFileSync(path.join(root, 'src/presentation/render/renderer/canvas2d-overlay-hud-pass.js'), 'utf8');
const previewSource = fs.readFileSync(path.join(root, 'src/presentation/render/preview/placement-preview-renderer.js'), 'utf8');
const master = html.match(/<input[^>]+id="showCanvasDebugText"[^>]*>/i);
assert(master, 'master canvas debug text checkbox must exist');
assert(!/\schecked(?:\s|=|>)/i.test(master[0]), 'master canvas debug text checkbox must be unchecked by default');
for (const id of ['showItemFacingDebug', 'showHabboDebugOverlay', 'shadowDebugDetailed']) {
  const match = html.match(new RegExp(`<input[^>]+id="${id}"[^>]*>`, 'i'));
  assert(match, `${id} must exist`);
  assert(!/\schecked(?:\s|=|>)/i.test(match[0]), `${id} must be unchecked by default`);
}
assert(hudSource.includes('if (!ctx || !showCanvasDebugText) return;'), 'source HUD must be gated by the master switch');
assert(previewSource.includes('if (showCanvasDebugText) {'), 'source placement status text must be gated by the master switch');
assert(main1.includes("getElementById('showCanvasDebugText')") && main1.includes('if(!ctx||!showCanvasDebugText)return;'), 'runtime HUD bundle must honor the master switch');
assert(main2.includes('HZH-HABBO-FINAL-PLACEMENT-FIX-V3'), 'runtime bundle must include the debug-default migration');
assert(main2.includes('if(showCanvasDebugText){ctx.fillStyle=stroke'), 'runtime placement label must be gated');
assert(main2.includes('if(!masterDebugText||!ui.showHabboDebugOverlay'), 'runtime Habbo overlay must be gated');
assert(main2.includes('if(!masterDebugText||!ui.showItemFacingDebug'), 'runtime item-facing overlay must be gated');

const staticConsumerSource = fs.readFileSync(path.join(root, 'src/presentation/render/optimization/shared-render-optimization-pixi-static-world-packet-consumer.js'), 'utf8');
assert(staticConsumerSource.includes('if (!isCanvasDebugTextMasterEnabledForPixiOverlay()) return false;'), 'Pixi player-chunk overlay must require the master debug switch');
assert(staticConsumerSource.includes("getItem('pixiPlayerChunkDebugOverlayV2')"), 'Pixi player-chunk overlay must use the opt-in storage key');
assert(main2.includes('function isCanvasDebugTextMasterEnabledForPixiOverlay()'), 'runtime Pixi chunk overlay must be master-gated');
console.log('PASS canvas-debug-text-master-default-off');
