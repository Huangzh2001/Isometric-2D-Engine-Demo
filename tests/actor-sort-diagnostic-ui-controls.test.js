const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const domRegistry = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(root, 'src/presentation/ui/ui.js'), 'utf8');

[
  'enableActorSortDiagAndReload',
  'disableActorSortDiagAndReload',
  'actorSortDiagStatus'
].forEach((id) => {
  assert(indexHtml.includes(`id="${id}"`), `index.html must expose #${id}`);
  assert(domRegistry.includes(`${id}: document.getElementById('${id}')`), `dom-registry must register #${id}`);
});

[
  'debugConsoleToExport',
  'actorSortDiag',
  'terrainPlayerDiag',
  'terrainSortDiag',
  'renderOrderHeavyDiagnostics'
].forEach((flag) => {
  assert(uiJs.includes(`'${flag}'`), `ui.js must manage ${flag}`);
});

assert(uiJs.includes("safeListen(ui.enableActorSortDiagAndReload, 'click'"), 'enable button must be wired');
assert(uiJs.includes("safeListen(ui.disableActorSortDiagAndReload, 'click'"), 'disable button must be wired');
assert(uiJs.includes('window.location.reload()') || uiJs.includes('location.reload()'), 'diagnostic buttons must reload after changing flags');

console.log('actor-sort-diagnostic-ui-controls.test: PASS');
