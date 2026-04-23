const fs = require('fs');
const path = require('path');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const html = fs.readFileSync(path.join(__dirname, '..', 'START_FLOOR_EDITOR.html'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/floor-editor/floor-editor-shell.js'), 'utf8');

assert(html.includes('id="rotateLeftBtn"'), 'rotateLeftBtn should exist');
assert(html.includes('id="rotateRightBtn"'), 'rotateRightBtn should exist');
assert(html.includes('id="currentViewDirectionLabel"'), 'currentViewDirectionLabel should exist');
assert(shell.includes('controller.rotateViewLeft()'), 'presentation should call application rotateViewLeft');
assert(shell.includes('controller.rotateViewRight()'), 'presentation should call application rotateViewRight');
assert(shell.includes('hitApi.getViewDirectionLabel'), 'presentation should show current core view direction');

console.log('floor-editor-rotation-layout.test.js: OK');
