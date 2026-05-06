#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/infrastructure/assets/habbo-root-config-service.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load habbo-root-config-service.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(facadeRel), 'root config service must load before asset-management.js');

const context = { console, Date, JSON, String, Number, Boolean, Object, Array, Promise, window: {} };
context.window = context;
vm.createContext(context);
runFile(context, ownerRel);
const api = context.__HABBO_ROOT_CONFIG_SERVICE__;
assert(api, 'root config service API missing');
assert.strictEqual(api.owner, ownerRel);

const normalized = api.sanitizeHabboAssetRootInput('"C:/habbo"', '');
assert.strictEqual(normalized.value, 'C:/habbo');
assert.strictEqual(normalized.normalized, true);
assert.strictEqual(normalized.reason, 'trimmed-quotes');
const deduped = api.sanitizeHabboAssetRootInput('D:/xD:/x', 'D:/x');
assert.strictEqual(deduped.value, 'D:/x');
assert.strictEqual(deduped.reason, 'dedup-existing-root-repeat');

let state = { configured: false, root: '', exists: false, itemCount: 0, lastError: '', fetchedAt: 0 };
let requestSeq = 0;
let inFlightPromise = null;
let inFlightRequestId = 0;
let pendingRoot = '';
const logs = [];
const deps = {
  owner: 'src/infrastructure/assets/asset-management.js',
  getRootState: () => state,
  setRootState: (next) => { state = next; return state; },
  getInFlightPromise: () => inFlightPromise,
  setInFlightPromise: (promise) => { inFlightPromise = promise; },
  getInFlightRequestId: () => inFlightRequestId,
  setInFlightRequestId: (id) => { inFlightRequestId = id; },
  getPendingRoot: () => pendingRoot,
  setPendingRoot: (root) => { pendingRoot = root; },
  nextRequestId: () => { requestSeq += 1; return requestSeq; },
  shouldUseAssetWorkflowCompat: () => false,
  getAssetWorkflowCompatApi: () => null,
  habboRootSupported: () => true,
  updateHabboRootStatus: (msg) => { logs.push(['status', msg || '']); },
  getHabboApiAdapter: () => ({
    getConfig: async () => ({ response: { ok: true, status: 200 }, data: { configured: true, root: 'C:/ok', exists: true, itemCount: 7 } }),
    setConfig: async (rootArg) => ({ response: { ok: true, status: 200 }, rawText: '{}', data: { configured: true, root: rootArg, exists: true, itemCount: 9 } }),
  }),
  habboLibraryLog: (msg) => logs.push(['library', msg]),
  logRequestOrchestration: (kind, detail) => logs.push(['request', kind, detail]),
  pushLog: (msg) => logs.push(['push', msg]),
};

(async () => {
  const fetched = await api.fetchHabboAssetRootConfig({ silent: false }, deps);
  assert.strictEqual(fetched.root, 'C:/ok');
  assert.strictEqual(fetched.itemCount, 7);
  const setResult = await api.setHabboAssetRootConfig('C:/new', deps);
  assert.strictEqual(setResult.root, 'C:/new');
  assert.strictEqual(setResult.itemCount, 9);
  const inFlight = api.getHabboRootConfigInFlightState(deps);
  assert.strictEqual(inFlight.inFlight, false);
  assert.strictEqual(inFlight.requestId, 0);
  assert.strictEqual(inFlight.pendingRoot, '');
  assert(logs.some((entry) => String(entry[1]).includes('habbo-root:get:start')), 'should log get start');
  assert(logs.some((entry) => String(entry[1]).includes('habbo-root:set:start')), 'should log set start');
  console.log('PASS habbo-root-config-service-boundary');
})().catch((err) => { console.error(err); process.exit(1); });
