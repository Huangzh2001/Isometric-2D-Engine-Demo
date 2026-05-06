#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/infrastructure/assets/asset-workflow-service.js'), 'utf8');
const sandbox = { console, globalThis: null, Date };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'asset-workflow-service.js' });
const service = sandbox.__ASSET_WORKFLOW_SERVICE__;
if (!service || service.owner !== 'src/infrastructure/assets/asset-workflow-service.js') throw new Error('missing owner export');
(async () => {
  const lib = { summaryLoaded: true, loaded: false, totalItems: 4, activeType: 'room', loadError: '', items: [] };
  const rootState = { configured: true, exists: true, itemCount: 7, root: '/tmp/habbo' };
  const api = service.createAssetWorkflowApi({
    getHabboAssetRootState: () => rootState,
    getHabboLibraryState: () => lib,
    getHabboRootConfigInFlightState: () => ({ inFlight: false, pendingRoot: '' }),
    getAssetPrefabScanSnapshot: () => ({ inFlight: false, totalFiles: 3, importedCount: 2, ids: ['a'], lastError: '', lastSummary: 'ok' }),
    getHabboLibraryCategoriesForType: () => ['all'],
    fetchHabboAssetRootConfig: async () => rootState,
    fetchHabboLibrarySummary: async () => lib,
    fetchHabboLibraryPage: async () => { lib.loaded = true; lib.items = [1, 2]; },
    scanAssetPrefabs: async () => true,
    saveCustomPrefabsToLocalStorage: () => true,
    listCustomPrefabs: () => [{ id: 'x' }],
    ensureAssetPrefabScanState: () => ({ ids: new Set(['a']) })
  });
  const rootResult = await api.ensureHabboRootReady({ source: 'test' });
  if (!rootResult.ok || rootResult.root !== '/tmp/habbo') throw new Error('root workflow result mismatch');
  const summary = await api.ensureHabboLibrarySummary({ force: true });
  if (!summary.ok || summary.totalItems !== 4) throw new Error('summary workflow result mismatch');
  const persisted = api.persistCustomPrefabs({});
  if (!persisted.ok || persisted.persistedCount !== 1) throw new Error('persist workflow result mismatch');
  const snap = api.summarize();
  if (snap.counters.ensureHabboRootReadyCalls !== 1 || snap.counters.persistCustomPrefabsCalls !== 1) throw new Error('workflow counters not tracked in owner');
  console.log('PASS asset-workflow-service-boundary');
})().catch((err) => { console.error(err); process.exit(1); });
