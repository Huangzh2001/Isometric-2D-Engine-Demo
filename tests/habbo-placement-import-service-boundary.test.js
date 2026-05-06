#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/infrastructure/assets/habbo-placement-import-service.js'), 'utf8');
const sandbox = { console, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'habbo-placement-import-service.js' });
const service = sandbox.__HABBO_PLACEMENT_IMPORT_SERVICE__;
if (!service || service.owner !== 'src/infrastructure/assets/habbo-placement-import-service.js') throw new Error('missing owner export');
(async () => {
  const calls = [];
  const existing = { id: 'habbo:room/foo', name: 'Foo Chair' };
  const reused = await service.loadHabboLibraryItemToPlacement({ swfRelativePath: 'room/foo.swf', displayName: 'Foo' }, {}, {
    makeHabboPrefabIdFromRelativePath: () => 'habbo:room/foo',
    findPrefabByIdExact: () => existing,
    dedupeImportedPrefab: (...args) => calls.push(['dedupe', args]),
    pushLog: (msg) => calls.push(['log', msg]),
    prepareImportedPrefabForPlacement: (...args) => calls.push(['prepare', args]),
    setHabboImportStatus: (msg) => calls.push(['status', msg])
  });
  if (!reused.reused || reused.prefab !== existing) throw new Error('existing prefab path should reuse');
  if (!calls.some((c) => c[0] === 'prepare')) throw new Error('reuse path must prepare for placement');

  const imported = await service.loadHabboLibraryItemToPlacement({ swfRelativePath: 'room/bar.swf', displayName: 'Bar' }, {}, {
    makeHabboPrefabIdFromRelativePath: () => 'habbo:room/bar',
    findPrefabByIdExact: () => null,
    fetchHabboAssetFileBuffer: async () => Buffer.from('swf'),
    basenameFromPath: () => 'bar.swf',
    makeHabboDisplayNameFromRelativePath: () => 'Bar',
    importHabboSwfToSceneFromBuffer: async (buffer, opts) => ({ prefab: { name: opts.displayName }, opts }),
    setHabboImportStatus: (msg) => calls.push(['status', msg])
  });
  if (!imported || imported.prefab.name !== 'Bar') throw new Error('import path did not import prefab');
  console.log('PASS habbo-placement-import-service-boundary');
})().catch((err) => { console.error(err); process.exit(1); });
