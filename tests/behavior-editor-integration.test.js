const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('START_V18_ONLY.html', 'utf8');
const css = fs.readFileSync('styles/editor-flat-v4.css', 'utf8');
const unified = fs.readFileSync('src/presentation/editor/editor-unified-v18.js', 'utf8');
const behavior = fs.readFileSync('src/presentation/editor/behavior-editor.js', 'utf8');
const bundle = fs.readFileSync('dist/bundles/editor-2.bundle.js', 'utf8');

for (const id of [
  'editorStepBehavior', 'behaviorWorkspace', 'behaviorScript', 'behaviorCommandList',
  'behaviorEventList', 'behaviorLibrarySearch', 'behaviorLibraryResults',
  'behaviorTargetInterfaces', 'behaviorGameApiList', 'saveBehaviorSummary'
]) assert(html.includes(`id="${id}"`), `missing behavior UI ${id}`);

assert(html.indexOf('editorStepBehavior') < html.indexOf('editorStepSave'), 'behavior must be step 3 before export');
assert(html.includes('<span>3</span><strong>编辑行为</strong>'), 'behavior step number should be 3');
assert(html.includes('<span>4</span><strong>导出</strong>'), 'export step number should be 4');
assert(html.includes('src/presentation/editor/behavior-editor.js'), 'behavior editor script missing');
assert(css.includes('body[data-editor-step="behavior"] .behaviorWorkspace'), 'behavior step display CSS missing');
assert(css.includes('.behaviorAutocomplete'), 'autocomplete styling missing');

for (const token of [
  'defaultBehaviorDefinition', 'normalizeBehaviorDefinition', 'behavior: normalizeBehaviorDefinition(state.behavior)',
  'setBehaviorDraft', 'getBehaviorDraft', "['behavior', ui.editorStepBehavior]"
]) assert(unified.includes(token), `unified editor behavior integration missing ${token}`);

for (const token of [
  'world:findByPrefab', 'game.economy:addGold', 'game.progression:addExperience',
  'refreshLibrary', 'makeCommandSnippet', "e.code === 'Space'", 'publicApi', 'registerBeforeExportHook'
]) assert(behavior.includes(token), `behavior editor feature missing ${token}`);

assert(bundle.includes("const BUILD_VERSION = '20260807-behavior-v1';"), 'editor bundle not rebuilt with behavior build');
assert(bundle.includes('setBehaviorDraft'), 'editor bundle missing behavior draft API');

console.log('behavior-editor-integration.test.js: OK');
