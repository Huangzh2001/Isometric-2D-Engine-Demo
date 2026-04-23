const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const ctx = { window: {} };
ctx.window.__APP_NAMESPACE = { bind(path, api) { ctx.bound = api; } };
ctx.window.App = { domain: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('src/core/domain/item-facing-core.js', 'utf8'), ctx);
const api = ctx.window.__ITEM_FACING_CORE__;

const map = api.getDefaultSemanticTextureMap();
for (const key of ['top','north','east','south','west']) {
  assert(map[key], 'missing texture ' + key);
  assert(map[key].textureId, 'missing textureId ' + key);
  assert(map[key].color, 'missing solid color ' + key);
  assert.strictEqual(map[key].semanticFace, key, 'semanticFace mismatch ' + key);
}
assert.strictEqual(map.top.color, '#2F80ED');
assert.strictEqual(map.north.color, '#E74C3C');
assert.strictEqual(map.east.color, '#27AE60');
assert.strictEqual(map.south.color, '#F2C94C');
assert.strictEqual(map.west.color, '#9B51E0');
console.log('debug-semantic-texture-map.test.js passed');
