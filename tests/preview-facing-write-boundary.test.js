const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function read(rel) { return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'); }

const appShell = read('src/presentation/shell/app.js');
const ui = read('src/presentation/ui/ui.js');
const controller = read('src/application/controllers/app-controllers.js');

const wheelBlock = appShell.slice(appShell.indexOf("safeListen(canvas, 'wheel'"), appShell.indexOf("}, 'canvas:wheel')"));
assert(wheelBlock.includes('rotatePreviewFacingByWheel'), 'canvas wheel should route to application rotatePreviewFacingByWheel');
assert(wheelBlock.includes("editor.mode === 'place' && editor.preview"), 'canvas wheel should only rotate preview during active placement preview');
assert(!/editor\.previewFacing\s*=/.test(wheelBlock), 'canvas wheel must not directly write editor.previewFacing');

const qKeyBlock = appShell.slice(appShell.indexOf("else if (k === 'q'"), appShell.indexOf("else if (k === 'e'"));
const eKeyBlock = appShell.slice(appShell.indexOf("else if (k === 'e'"), appShell.indexOf("else if (e.key === 'Escape'"));
assert(!/editor\.previewFacing\s*=/.test(qKeyBlock + eKeyBlock), 'Q/E preview rotate fallback must not directly write editor.previewFacing');
assert(qKeyBlock.includes('rotatePreviewFacing'), 'Q key should route through application rotatePreviewFacing');
assert(eKeyBlock.includes('rotatePreviewFacing'), 'E key should route through application rotatePreviewFacing');

const uiPreviewSection = ui.slice(ui.indexOf('function uiHandlePreviewFacingRotate'), ui.indexOf('function uiHandleSelectedFacingRotate'));
assert(!/editor\.previewFacing\s*=/.test(uiPreviewSection), 'UI preview facing handlers must not directly write editor.previewFacing');
assert(uiPreviewSection.includes('rotatePreviewFacing') && uiPreviewSection.includes('setPreviewFacing'), 'UI preview facing handlers should use application controller entrypoints');

assert(controller.includes('function getPreviewFacing'), 'application controller should expose getPreviewFacing');
assert(controller.includes('function setPreviewFacing'), 'application controller should expose setPreviewFacing');
assert(controller.includes('function rotatePreviewFacingByWheel'), 'application controller should expose rotatePreviewFacingByWheel');
assert(controller.includes('presentationDirectWrite: false'), 'application logs should mark presentationDirectWrite false');

console.log('preview-facing-write-boundary.test.js: OK');
