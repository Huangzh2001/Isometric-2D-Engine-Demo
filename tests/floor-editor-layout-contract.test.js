const fs = require('fs');
const path = require('path');

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const html = fs.readFileSync(path.join(__dirname, '..', 'START_FLOOR_EDITOR.html'), 'utf8');
const shell = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/floor-editor/floor-editor-shell.js'), 'utf8');
assert(html.includes('sidebar sidebar--macro'), 'left macro sidebar should exist');
assert(html.includes('sidebar sidebar--current'), 'right current-level sidebar should exist');
assert(html.includes('id="levelList"'), 'level list must exist in left macro panel');
assert(html.includes('id="currentLevelColorInput"'), 'current level color input must exist in right panel');
assert(html.includes('id="levelOverlapCanvas"'), 'overlap preview canvas must exist');
assert(shell.includes('domain.getLevelColor(state.floorPlan, level)'), 'level list and render surfaces should use core-provided level identity colors');
assert(shell.includes('controller.applyCurrentLevelMeta({'), 'right panel should apply current-level meta through controller');
console.log('floor-editor-layout-contract.test.js: OK');
