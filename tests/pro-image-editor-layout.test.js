const assert = require('assert');
const fs = require('fs');
const html = fs.readFileSync('START_V18_ONLY.html','utf8');
const css = fs.readFileSync('styles/editor-v18.css','utf8');
const js = fs.readFileSync('src/presentation/editor/pixel-art-editor.js','utf8');

for (const token of ['imageWorkspaceShell','pixelToolDock','pixelInspector','pixelToggleLeftDock','pixelToggleRightDock','pixelRestoreLeftDock','pixelRestoreRightDock','pixelFocusMode','proDirectionSegment']) {
  assert(html.includes(token), `layout missing ${token}`);
}
assert(!html.includes('directionPanel'), '2x2 direction panel must be removed');
assert(!html.includes('Habbo 分层校准视图'), 'Habbo-specific editor surface must be removed');
for (const state of ['data-left-dock="expanded"','data-right-dock="expanded"']) assert(html.includes(state), `initial dock state missing ${state}`);
for (const selector of ['[data-left-dock="compact"]','[data-left-dock="hidden"]','[data-right-dock="compact"]','[data-right-dock="hidden"]','.focusMode']) assert(css.includes(selector), `CSS missing ${selector}`);
assert(css.includes('backdrop-filter: none'), 'early Apple style must avoid glass blur');
assert(css.includes('--pro-chrome-top: #eef0f2') && css.includes('linear-gradient(180deg, var(--pro-chrome-top)'), 'chrome gradient missing');
assert(js.includes("current==='expanded'?'compact':current==='compact'?'hidden':'expanded'"), 'dock must cycle through three states');
assert(js.includes("if(e.key==='Tab')"), 'Tab focus mode missing');
assert(js.includes("move: ['移动图层'"), 'move-layer tool missing');
console.log('pro-image-editor-layout.test.js: OK');
