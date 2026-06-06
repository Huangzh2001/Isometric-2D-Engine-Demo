const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert(html.includes('id="worldSceneSelect"'), 'World page should expose world scene select');
assert(html.includes('id="worldSceneName"'), 'World page should expose new world filename input');
assert(html.includes('id="refreshWorldScenes"'), 'World page should expose refresh world list button');
assert(html.includes('id="loadWorldScene"'), 'World page should expose load selected world button');
assert(html.includes('id="saveWorldScene"'), 'World page should expose save current world button');
assert(html.includes('id="saveWorldSceneAs"'), 'World page should expose save as new world button');
assert(html.includes('id="newWorldScene"'), 'World page should expose create empty world button');
assert(html.includes('src/application/world/world-file-controller.js'), 'index should load application world file controller');
assert(html.includes('src/presentation/ui/ui-world-files-panel.js'), 'index should load world files UI panel');

const dom = fs.readFileSync(path.join(root, 'src/presentation/shell/dom-registry.js'), 'utf8');
assert(dom.includes('worldSceneSelect:'), 'DOM registry should expose worldSceneSelect');
assert(dom.includes('worldSceneStatus:'), 'DOM registry should expose worldSceneStatus');

const sceneApi = fs.readFileSync(path.join(root, 'src/infrastructure/services/scene-api.js'), 'utf8');
assert(sceneApi.includes('/api/scenes/index'), 'scene-api should define scenes index endpoint');
assert(sceneApi.includes('listScenes'), 'scene-api should expose listScenes');

const controller = fs.readFileSync(path.join(root, 'src/application/world/world-file-controller.js'), 'utf8');
assert(controller.includes('WORLD-FILES-V1-SCENE-FOLDER'), 'world file controller should identify V1 scene folder phase');
assert(controller.includes('listWorldFiles'), 'world file controller should list world files');
assert(controller.includes('saveWorldFile'), 'world file controller should save a named world file');
assert(controller.includes('loadWorldFile'), 'world file controller should load a named world file');

const ui = fs.readFileSync(path.join(root, 'src/presentation/ui/ui-world-files-panel.js'), 'utf8');
assert(ui.includes('refreshWorldScenes'), 'world files UI should refresh world list');
assert(ui.includes('saveAsWorld'), 'world files UI should support save as new world');
assert(ui.includes('newWorldAndSave'), 'world files UI should support create empty world');

const server = fs.readFileSync(path.join(root, 'server/local_server.py'), 'utf8');
assert(server.includes("'/api/scenes/index'"), 'server route registry should include scenes index');
assert(server.includes('def list_scene_files'), 'server should implement scene file listing');
assert(server.includes("if parsed.path == '/api/scenes/index'"), 'server should handle GET /api/scenes/index');

console.log('world-file-panel-structure.test.js PASS');
