const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync('START_V18_ONLY.html', 'utf8');
const css = fs.readFileSync('styles/editor-flat-v4.css', 'utf8');
const world = fs.readFileSync('src/presentation/editor/behavior-test-world.js', 'utf8');
const bridge = fs.readFileSync('src/presentation/editor/behavior-main-test-bridge.js', 'utf8');
const library = fs.readFileSync('src/infrastructure/assets/emergent-asset-library-service.js', 'utf8');
const server = fs.readFileSync('server/local_server.py', 'utf8');
const mainHtml = fs.readFileSync('index.html', 'utf8');

for (const id of [
  'behaviorTestWorld','behaviorMainTestFrame','behaviorMainTestFrameLoading','behaviorTestLibraryPath',
  'behaviorTestConnectLibrary','behaviorTestChooseFolder','behaviorTestFolderInput','behaviorTestAssetSearch',
  'behaviorTestAssetList','behaviorTestSyncCurrent','behaviorTestReset','behaviorTestConsole'
]) assert(html.includes(`id="${id}"`), `missing TestWorld UI ${id}`);

assert(!html.includes('behaviorTestCanvas'), 'legacy fake TestWorld canvas must be removed');
assert(!html.includes('State 0↔1 点击模板'), 'state toggle template button must stay removed');
assert(!html.includes('behaviorTestRun'), 'Behavior run toggle must be removed; prefab behavior is always active');
assert(html.includes('index.html?embeddedBehaviorTest=1'), 'TestWorld must embed the real main editor entry');
assert(html.includes('webkitdirectory'), 'folder picker must support directories');
assert(mainHtml.includes('behavior-main-test-bridge.js'), 'main TestWorld bridge script missing');
assert(css.includes('.behaviorMainTestFrameWrap'), 'large embedded main TestWorld CSS missing');
assert(css.includes('min-height: 1080px'), 'TestWorld must be a large scroll-down area');

for (const token of ['HZH_TEST_IMPORT_PREFAB','syncCurrent','postToMain','registerLocalFiles'])
  assert(world.includes(token), `TestWorld host missing ${token}`);

for (const token of [
  'embeddedBehaviorTest','HZH_TEST_MAIN_READY','compilePrefab','buildStateSpriteDirections',
  'pickBoxAtScreen','findInstanceForBox','rebuildBoxesFromInstances','self:setState','world:findByPrefab','onClick',
  'alwaysOn: true','initialStateId(p || {})'
]) assert(bridge.includes(token), `main TestWorld bridge missing ${token}`);

for (const token of ['getConfig','setRoot','fetchIndex','registerLocalFiles','loadItem','/api/asset-library/file'])
  assert(library.includes(token), `asset library service missing ${token}`);

for (const route of ['/api/asset-library/config','/api/asset-library/index','/api/asset-library/file'])
  assert(server.includes(route), `server missing ${route}`);
assert(server.includes('list_asset_library_items'), 'server asset library scan missing');
assert(server.includes('resolve_asset_library_path'), 'server asset path boundary missing');

console.log('behavior-test-world-integration.test.js: OK');
