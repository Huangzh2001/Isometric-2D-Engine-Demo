const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const controls = fs.readFileSync(path.join(root, 'src/presentation/ui/pixi-backend-test-controls.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src/presentation/ui/ui.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
for (const id of ['showPixiPlayerChunkDebugOverlay', 'showItemFacingDebug']) {
  const match = html.match(new RegExp(`<input[^>]+id="${id}"[^>]*>`));
  assert(match, `${id} must exist`);
  assert(!/\schecked(?:\s|=|>)/i.test(match[0]), `${id} must not be checked in HTML`);
}
assert(controls.includes("PLAYER_CHUNK_DEBUG_STORAGE_KEY = 'pixiPlayerChunkDebugOverlayV2'"), 'Pixi debug toggle must use a migrated opt-in storage key');
assert(controls.includes('return false;\n  }\n\n  function setPlayerChunkDebugOverlayEnabled'), 'Pixi debug overlay fallback must be false');
assert(ui.includes('if (ui.showItemFacingDebug) ui.showItemFacingDebug.checked = false'), 'item-facing overlay must be forced off at boot');
assert(bundle.includes("global.localStorage.setItem('pixiPlayerChunkDebugOverlay', '0')"), 'runtime bundle must clear stale old default-on state');
console.log('PASS visual-debug-default-off-v2');
