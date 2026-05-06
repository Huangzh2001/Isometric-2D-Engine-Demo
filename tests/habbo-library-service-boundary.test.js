#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function runFile(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

const ownerRel = 'src/infrastructure/assets/habbo-library-service.js';
const facadeRel = 'src/infrastructure/assets/asset-management.js';
const indexSource = read('index.html');
assert(indexSource.includes(ownerRel), 'index.html must load habbo-library-service.js');
assert(indexSource.indexOf(ownerRel) < indexSource.indexOf(facadeRel), 'Habbo library service must load before asset-management.js');

const context = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  JSON,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Promise,
  encodeURIComponent,
  URLSearchParams,
  performance: { now: () => 1234 },
  window: {},
};
context.window.window = context.window;
vm.createContext(context);
runFile(context, ownerRel);
const api = context.window.__HABBO_LIBRARY_SERVICE__;
assert(api, 'Habbo library service API missing');
assert.strictEqual(api.owner, ownerRel);
assert.strictEqual(typeof api.fetchHabboLibrarySummary, 'function');
assert.strictEqual(typeof api.fetchHabboLibraryPage, 'function');
assert.strictEqual(typeof api.fetchHabboLibraryIndex, 'function');

context.habboLibraryState = {
  summaryLoaded: false,
  summaryLoading: false,
  summaryPending: false,
  loadError: '',
  loading: false,
  summaryPromise: null,
  pagePromise: null,
  pageLoading: false,
  items: [],
  activeType: 'room',
  activeCategory: 'all',
  search: '',
  page: 1,
  pageSize: 15,
  categoriesByType: { room: [], wall: [] },
  totalsByType: { room: 0, wall: 0 },
  totalItems: 0,
};
context.habboAssetRootState = { itemCount: 0, root: '' };
context.habboRootConfigInFlightPromise = null;
context.ASSET_MANAGEMENT_OWNER = 'src/infrastructure/assets/asset-management.js';
context.shouldUseAssetWorkflowCompat = () => false;
context.getAssetWorkflowCompatApi = () => null;
context.awaitHabboRootConfigInFlight = async () => {};
context.habboRootSupported = () => false;
context.setHabboLibraryDebugText = (lines) => { context.habboLibraryState.debugText = Array.isArray(lines) ? lines.join('\n') : String(lines || ''); };
context.habboLibraryLog = () => {};
context.logRequestOrchestration = () => {};

api.fetchHabboLibrarySummary(false).then((state) => {
  assert.strictEqual(state, context.habboLibraryState, 'summary should return shared state');
  assert.strictEqual(context.habboLibraryState.summaryLoaded, false);
  assert.strictEqual(context.habboLibraryState.summaryPending, false);
  assert(context.habboLibraryState.loadError.includes('server'), 'non-server error should be recorded');
  assert.strictEqual(context.habboLibraryState.debugText, 'serverMode=false');
  return api.fetchHabboLibraryIndex(false);
}).then((state) => {
  assert.strictEqual(state, context.habboLibraryState, 'index should return shared state');
  console.log('PASS habbo-library-service-boundary');
}).catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
