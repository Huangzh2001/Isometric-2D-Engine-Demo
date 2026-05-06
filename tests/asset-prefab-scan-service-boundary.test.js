#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/infrastructure/assets/asset-prefab-scan-service.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load asset-prefab-scan-service.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(facadeRel), 'scan service must load before asset-management.js');

const context = { console, Set, Map, Date, JSON, Array, Object, String, Number, Boolean, Promise, encodeURIComponent, window: {} };
context.window.window = context.window;
vm.createContext(context);
runFile(context, ownerRel);
const api = context.window.__ASSET_PREFAB_SCAN_SERVICE__;
assert(api, 'scan service API missing');
assert.strictEqual(api.owner, ownerRel);

const st = api.ensureAssetPrefabScanState();
assert(st.ids instanceof Set, 'state.ids must be a Set');
api.markAssetManagedPrefab('prefab_a', { setAssetManagedPrefabIds(ids) { context.lastIds = ids; } });
assert(st.ids.has('prefab_a'), 'markAssetManagedPrefab should update scan ids');
assert.strictEqual(context.lastIds, st.ids, 'markAssetManagedPrefab should notify assetManagedPrefabIds setter');
let snapshot = api.getAssetPrefabScanSnapshot({ isServerMode: () => true });
assert.strictEqual(snapshot.serverMode, true);
assert(snapshot.ids.includes('prefab_a'), 'snapshot should include managed id');

const prototypes = [{ id: 'old_asset', assetManaged: true }, { id: 'manual', custom: true }];
const logs = [];
const decisions = [];
const orchestration = [];
let refreshed = false;
let registryRefreshed = false;
const deps = {
  owner: 'src/infrastructure/assets/asset-management.js',
  isServerMode: () => true,
  pushLog: (msg) => logs.push(String(msg)),
  shouldUseAssetWorkflowCompat: () => false,
  getAssetWorkflowCompatApi: () => null,
  getPrefabApiAdapter: () => ({
    fetchIndex: async () => ({ response: { ok: true, status: 200 }, data: { items: [
      { file: 'chair.json', id: 'asset_chair', name: 'Chair', kind: 'prefab', mtimeMs: 10 }
    ] } })
  }),
  getAssetApiAdapter: () => ({
    fetchJsonAsset: async () => ({ data: { id: 'asset_chair', name: 'Chair', voxels: [{ x: 0, y: 0, z: 0 }] } })
  }),
  getPrefabRegistryWriteApi: () => ({ refreshPrototypeSelection: () => { registryRefreshed = true; } }),
  logRequestOrchestration: (kind, detail) => orchestration.push({ kind, detail }),
  logAssetScanPrefabDecision: (kind, item, extra) => decisions.push({ kind, item, extra }),
  refreshAssetScanStatus: () => { refreshed = true; },
  refreshPrefabSelectOptions: () => { throw new Error('registry refresh should be preferred'); },
  getPrototypes: () => prototypes,
  importPrefabDefinition: (def) => { const prefab = { id: def.id, assetManaged: true }; prototypes.push(prefab); return prefab; },
  recordPrefabRegistryWrite: () => {},
  setAssetManagedPrefabIds: (ids) => { context.lastIds = ids; },
  setLastAssetPrefabScanAt: (value) => { context.lastScanAt = value; },
  setAssetPrefabScanInFlight: (value) => { context.inFlight = value; }
};
api.ensureAssetPrefabScanState().ids.add('old_asset');
api.scanAssetPrefabs({ force: true, __skipWorkflowCompat: true }, deps).then((ok) => {
  assert.strictEqual(ok, true, 'scan should succeed');
  assert(prototypes.some((p) => p.id === 'asset_chair'), 'scan should import new prefab');
  assert(!prototypes.some((p) => p.id === 'old_asset'), 'scan should remove missing asset-managed prefab');
  assert(registryRefreshed, 'registry refresh should run');
  assert(refreshed, 'status refresh should run');
  assert(decisions.some((entry) => entry.kind === 'reimport-required'), 'decision log should be emitted');
  assert(orchestration.some((entry) => entry.kind === 'done'), 'orchestration done log should be emitted');
  assert(logs.some((line) => line.includes('prefab-assets: scanned files=1')), 'scan summary log missing');
  console.log('PASS asset-prefab-scan-service-boundary');
}).catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
