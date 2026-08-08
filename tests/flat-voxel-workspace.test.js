'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'START_V18_ONLY.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles/editor-flat-v4.css'), 'utf8');
const workspace = fs.readFileSync(path.join(root, 'src/presentation/editor/voxel-workspace.js'), 'utf8');
const core = fs.readFileSync(path.join(root, 'src/presentation/editor/editor-unified-v18.js'), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

assert(html.includes('id="voxelDualViewport"'), 'missing dual voxel viewport');
assert(html.includes('id="gridCanvas"') && html.includes('id="previewCanvas"'), 'missing top-down or isometric canvas');
assert(html.indexOf('id="gridCanvas"') < html.indexOf('id="previewCanvas"'), 'dual view order should be top-down then isometric');
assert(html.includes('id="voxelAlignImageMode"'), 'missing image-alignment mode');
assert(html.includes('data-voxel-tab="alignment"'), 'missing alignment inspector tab');
assert(html.includes('id="spriteOffsetX"') && html.includes('id="spriteOffsetY"') && html.includes('id="spriteScale"'), 'missing image alignment controls');
assert(html.includes('id="saveWorkspace"') && html.includes('id="exportUnifiedMaterial"'), 'missing redesigned export workspace');
assert(!html.includes('Habbo 分层校准视图'), 'separate Habbo calibration surface must not return');
assert(css.includes('grid-template-columns: minmax(260px, var(--voxel-grid-ratio)) 6px minmax(360px, 1fr)'), 'dual viewport splitter layout missing');
assert(css.includes('[data-left-dock="hidden"]') && css.includes('[data-right-dock="hidden"]'), 'collapsible voxel docks missing');
assert(!css.includes('backdrop-filter'), 'flat v4 theme must not use glass blur');
assert(workspace.includes("api.setInteractionMode(next"), 'alignment mode is not connected to runtime interaction mode');
assert(workspace.includes("ui.renderMode.value = visible ? 'sprite_proxy' : 'voxel'"), 'image visibility is not connected to render mode');
assert(workspace.includes("--voxel-grid-ratio"), 'splitter does not update the dual-view ratio');
assert(core.includes('setInteractionMode,'), 'editor API does not expose interaction mode');
assert(core.includes('getSpriteTransform:'), 'editor API does not expose image transform for review');
assert(core.includes('lockHorizontal: false'), 'image alignment should allow X and Y dragging by default');
console.log('flat-voxel-workspace.test.js: OK');
