const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('START_V18_ONLY.html', 'utf8');
const pixelEditor = fs.readFileSync('src/presentation/editor/pixel-art-editor.js', 'utf8');
const unifiedEditor = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const habboImport = fs.readFileSync('src/presentation/editor/habbo-import-editor-feature.js', 'utf8');

for (const id of [
  'materialStateBar', 'materialStateTabs', 'materialStateAdd', 'materialStateDuplicate',
  'materialStateRename', 'materialStateDelete', 'materialStateMoveLeft', 'materialStateMoveRight',
  'materialStateCopyLayer', 'materialStatePasteLayer', 'materialStateCopyFacing',
  'materialStateTarget', 'materialStateTargetFacing', 'voxelActiveStateLabel',
]) {
  assert(html.includes(`id="${id}"`), `missing state UI control ${id}`);
}
assert(html.indexOf('src/core/domain/material-state-core.js') < html.indexOf('src/application/assets/material-state-workflow-controller.js'), 'material state core must load before workflow');
assert(html.indexOf('src/application/assets/material-state-workflow-controller.js') < html.indexOf('src/presentation/editor/pixel-art-editor.js'), 'material state workflow must load before editor');

for (const token of ['materialStates', 'artworkStateBundle', 'voxelStateBundle', 'replaceMaterialStates', 'copyFacingToState']) {
  assert(pixelEditor.includes(token), `pixel editor missing ${token}`);
}
for (const token of ['getVoxelSnapshot', 'applyVoxelSnapshot', 'getSpriteStateSnapshot', 'applySpriteStateSnapshot', 'setMaterialStateBundle']) {
  assert(unifiedEditor.includes(token), `unified editor API missing ${token}`);
}
assert(habboImport.includes('buildGenericArtworkStates'), 'Habbo importer must build multiple states');
assert(habboImport.includes('habbo-multi-state-import'), 'Habbo importer must replace the editor state bundle');
assert(habboImport.includes('sourceStateId'), 'Habbo layer metadata must preserve source state id');

console.log('editor-material-state-ui.test.js: OK');
