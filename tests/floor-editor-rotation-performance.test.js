const fs = require('fs');
const path = require('path');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const shell = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/floor-editor/floor-editor-shell.js'), 'utf8');

assert(shell.includes('requestAnimationFrame(stepRotationAnimation)'), 'rotation animation should use requestAnimationFrame');
assert(shell.includes('overlapPreviewCache'), 'rotation animation should reuse overlap preview cache during animation');
assert(!shell.includes('gsap') && !shell.includes('anime(') && !shell.includes('three'), 'rotation animation should not use third-party libs');
assert(shell.includes('interactionFrozen()'), 'rotation animation should freeze high-frequency interactions while animating');

console.log('floor-editor-rotation-performance.test.js: OK');
