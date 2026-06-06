const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('Debug / 选择高光'), 'Test / Debug should contain a selection highlight group near the top');
assert(html.includes('id="selectedInstanceEdgeHighlightEnabled"'), 'selection highlight checkbox should exist');
assert(html.includes('id="selectedInstanceHighlightStatus"'), 'selection highlight status should exist');
assert(html.includes('src/presentation/ui/ui-selection-highlight-panel.js'), 'selection highlight panel script should be loaded');

const dom = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
assert(dom.includes('selectedInstanceEdgeHighlightEnabled:'), 'dom registry should expose selected highlight checkbox');
assert(dom.includes('selectedInstanceHighlightStatus:'), 'dom registry should expose selected highlight status');

const runtime = fs.readFileSync(path.join(root, 'src/core/state/runtime-state.js'), 'utf8');
assert(runtime.includes('selectedInstanceEdgeHighlightEnabled: true'), 'runtime settings should default selected highlight on');

const render = fs.readFileSync(path.join(root, 'src/presentation/render/render.js'), 'utf8');
assert(render.includes('worldCuboidEdgeSegmentsForBox'), 'render should compute world-space cuboid edge segments');
assert(render.includes('drawSelectedInstanceDashedEdges'), 'render should draw dashed selected instance edges');
assert(render.includes('ctx.setLineDash([7, 4])'), 'selection highlight should use blue dashed edges');
assert(!render.includes("drawVoxelCell({ x: cell.x, y: cell.y, z: cell.z, base: '#6fb7ff' }"), 'old translucent fill highlight should be removed from selected highlight');

const panel = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-selection-highlight-panel.js'), 'utf8');
assert(panel.includes('clearSelectedInstance'), 'panel should support clearing selection');
assert(panel.includes('selectedInstanceEdgeHighlightEnabled'), 'panel should bind selected highlight checkbox');

console.log('selection-highlight-debug-ui.test.js PASS');
