const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const uiSource = fs.readFileSync(path.join(root, 'src/presentation/ui/ui.js'), 'utf8');
const registrySource = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-1.bundle.js'), 'utf8');
const input = html.match(/<input\s+id="showHabboDebugOverlay"[^>]*>/);
assert(input, 'Habbo debug overlay state input should exist');
assert(!/\schecked(?:\s|=|>)/i.test(input[0]), 'Habbo debug overlay must be off by default');
assert(/\shidden(?:\s|=|>)/i.test(input[0]), 'internal overlay state checkbox should not clutter the UI');
assert(html.includes('id="toggleHabboDebugOverlay"'), 'an explicit Habbo debug overlay button should exist');
assert(html.includes('显示 Habbo 调试信息'), 'button should clearly explain how to enable the overlay');
assert(registrySource.includes("toggleHabboDebugOverlay: document.getElementById('toggleHabboDebugOverlay')"),
  'DOM registry should expose the debug overlay button');
assert(uiSource.includes('function syncHabboDebugOverlayToggleUi()'), 'UI owner should keep button state and label synchronized');
assert(uiSource.includes("ui.showHabboDebugOverlay.checked = false"), 'UI boot should force the overlay off');
assert(bundle.includes('function syncHabboDebugOverlayToggleUi()'), 'runtime bundle should contain the button behavior');
console.log('PASS habbo-debug-overlay-default-off');
