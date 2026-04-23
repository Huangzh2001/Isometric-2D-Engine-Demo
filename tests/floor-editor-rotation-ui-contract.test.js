const fs = require('fs');
const path = require('path');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const html = fs.readFileSync(path.join(__dirname, '..', 'START_FLOOR_EDITOR.html'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/floor-editor/floor-editor-shell.js'), 'utf8');

assert(html.includes('id="rotationAnimationMsSelect"'), 'rotationAnimationMsSelect should exist');
assert(shell.includes('requestAnimationFrame(stepRotationAnimation)'), 'presentation should use requestAnimationFrame for lightweight rotation animation');
assert(!shell.includes('gsap') && !shell.includes('anime(') && !shell.includes('three'), 'rotation animation should not depend on third-party libraries');
assert(shell.includes('controller.completeViewRotationAnimation'), 'presentation should finish animation through application layer');

console.log('floor-editor-rotation-ui-contract.test.js: OK');
