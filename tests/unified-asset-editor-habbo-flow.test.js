const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(root, rel));

const launcher = read('start_editor.bat');
const html = read('START_V18_ONLY.html');
const editorSource = read('src/presentation/editor/editor-unified-v18.js');
const habboFeature = read('src/presentation/editor/habbo-import-editor-feature.js');

assert(/START_V18_ONLY\.html\?v=202608\d{2}-[A-Za-z0-9-]+/.test(launcher), 'start_editor.bat must open the unified editor');
assert(!launcher.includes('HABBO_CALIBRATION_EDITOR.html'), 'launcher must not open a separate Habbo editor');
assert(!exists('start_prefab_editor.bat'), 'split prefab editor launcher must be removed');
assert(!exists('HABBO_CALIBRATION_EDITOR.html'), 'split Habbo editor page must be removed');

for (const id of [
  'editorStepImage', 'editorStepVoxel', 'editorStepBehavior', 'editorStepSave',
  'importHabboSwf', 'habboSwfFile', 'pixelArtCanvas', 'pixelLayerList',
  'pixelToggleLeftDock', 'pixelToggleRightDock', 'saveLibrary', 'downloadJson'
]) assert(html.includes(`id="${id}"`), `unified editor missing #${id}`);

assert(!html.includes('id="habboUnifiedPanel"'), 'Habbo must not own a separate panel');
assert(!html.includes('id="habboCalibrationCanvas"'), 'Habbo must not own a separate calibration canvas');
assert(!html.includes('Habbo 分层校准视图'), 'separate Habbo view label must be removed');
assert(html.includes('src/infrastructure/habbo-calibration/habbo-swf-calibration-runtime.js'), 'unified editor must load the Habbo parser');
assert(html.includes('src/presentation/editor/habbo-import-editor-feature.js'), 'unified editor must load the Habbo import adapter');

for (const token of ['function applyImportedHabboAsset','function applyArtworkDocument','getArtworkDocument','getVoxelSnapshot']) {
  assert(editorSource.includes(token), `editor source missing ${token}`);
}
for (const token of ['buildGenericArtwork','core.createLayer','imageEditor.controller.setDocument','Editor.applyImportedHabboAsset','registrationPx','habbo-to-generic-artwork']) {
  assert(habboFeature.includes(token), `generic Habbo import missing ${token}`);
}
assert(!habboFeature.includes('habboCalibrationCanvas'), 'Habbo adapter must not depend on a dedicated canvas');
assert(!habboFeature.includes('habboLayerList'), 'Habbo adapter must not depend on a dedicated layer list');

console.log(JSON.stringify({
  status: 'PASS',
  workflow: ['generic image editor', 'shared voxel editor', 'behavior editor', 'unified export'],
  habboRole: ['layered image importer', 'voxel preset importer'],
  separateHabboSurface: false
}, null, 2));
