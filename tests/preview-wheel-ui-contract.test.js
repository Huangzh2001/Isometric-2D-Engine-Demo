const fs = require('fs');
const path = require('path');
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const app = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/shell/app.js'), 'utf8');
assert(app.includes("editor.mode === 'place' && editor.preview"), 'wheel handler should only rotate preview during active placement preview');
assert(app.includes('rotatePreviewFacingByWheel'), 'wheel handler should route to rotatePreviewFacingByWheel');
const wheelBlock = app.slice(app.indexOf("safeListen(canvas, 'wheel'"), app.indexOf("}, 'canvas:wheel')"));
assert(!wheelBlock.includes('rotateSelectedInstanceFacing'), 'wheel preview rotate must not call selected instance rotation');
assert(!wheelBlock.includes('updateInstanceRotation'), 'wheel preview rotate must not update placed instance rotation');
console.log('preview-wheel-ui-contract.test.js: OK');
