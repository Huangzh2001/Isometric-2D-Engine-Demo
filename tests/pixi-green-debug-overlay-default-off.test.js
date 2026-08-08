const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(condition, message) { if (!condition) throw new Error(message); }
function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`missing function ${name}`);
  const brace = source.indexOf('{', start);
  let depth = 0;
  let quote = null;
  for (let i = brace; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    if (ch === '}') { depth -= 1; if (depth === 0) return source.slice(start, i + 1); }
  }
  throw new Error(`unterminated function ${name}`);
}
const root = path.join(__dirname, '..');
const bundle = fs.readFileSync(path.join(root, 'dist/bundles/main-2.bundle.js'), 'utf8');
const master = { checked: false };
const storage = new Map([
  ['pixiPlayerChunkDebugOverlay', '1'],
  ['pixiPlayerChunkDebugOverlayV2', '1'],
  ['pixiPlayerChunkDebugOverlayLabels', '1']
]);
const context = {
  global: null,
  document: { getElementById(id) { return id === 'showCanvasDebugText' ? master : null; } },
  localStorage: { getItem(key) { return storage.get(key) || null; } }
};
context.global = context;
vm.createContext(context);
vm.runInContext([
  extractFunction(bundle, 'isCanvasDebugTextMasterEnabledForPixiOverlay'),
  extractFunction(bundle, 'isPlayerChunkDebugOverlayEnabled'),
  extractFunction(bundle, 'isPlayerChunkDebugOverlayLabelsEnabled')
].join('\n'), context);
context.__PIXI_PLAYER_CHUNK_DEBUG_OVERLAY__ = true;
assert(context.isPlayerChunkDebugOverlayEnabled() === false, 'master-off must suppress the green Pixi overlay even when stale flags and storage say on');
assert(context.isPlayerChunkDebugOverlayLabelsEnabled() === false, 'master-off must suppress all Pixi overlay labels');
master.checked = true;
context.__PIXI_PLAYER_CHUNK_DEBUG_OVERLAY__ = undefined;
assert(context.isPlayerChunkDebugOverlayEnabled() === true, 'master-on plus explicit V2 opt-in may enable the overlay');
assert(context.isPlayerChunkDebugOverlayLabelsEnabled() === true, 'labels require explicit opt-in while master is on');
console.log('PASS pixi-green-debug-overlay-default-off');
