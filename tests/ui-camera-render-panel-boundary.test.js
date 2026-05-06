#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const root = path.resolve(__dirname, '..');
const ownerRel = 'src/presentation/ui/ui-camera-render-panel.js';
const facadeRel = 'src/presentation/ui/ui.js';
const owner = fs.readFileSync(path.join(root, ownerRel), 'utf8');
const facade = fs.readFileSync(path.join(root, facadeRel), 'utf8');
assert(owner.includes('__UI_CAMERA_RENDER_PANEL__'), 'owner API missing');
assert(owner.includes('uiRefreshMainCameraPanel'), 'camera refresh owner missing');
assert(owner.includes('uiRefreshRenderPanel'), 'render refresh owner missing');
assert(facade.includes('getUiCameraRenderPanelService'), 'facade resolver missing');
assert(facade.includes('service.uiRefreshMainCameraPanel'), 'camera refresh wrapper missing');
assert(facade.includes('service.uiRefreshRenderPanel'), 'render refresh wrapper missing');
assert(!facade.includes('var __uiRenderControlInteractionLockUntil'), 'old render control lock state must leave ui.js');
console.log('PASS ui-camera-render-panel-boundary');
