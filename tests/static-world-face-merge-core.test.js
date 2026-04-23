const fs = require('fs');
const path = require('path');
const vm = require('vm');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderSource = fs.readFileSync(path.join(__dirname, '..', 'src/presentation/render/render.js'), 'utf8');
const mergeCoreSource = fs.readFileSync(path.join(__dirname, '..', 'src/core/domain/static-world-face-merge-core.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(mergeCoreSource, sandbox, { filename: 'static-world-face-merge-core.js' });
const api = sandbox.window.__STATIC_WORLD_FACE_MERGE_CORE__;
assert(indexSource.includes('src/core/domain/static-world-face-merge-core.js'), 'main entry should load static-world face merge core');
assert(renderSource.includes('mergeFaceDescriptors'), 'render layer should invoke face merge descriptors helper');
assert(api && typeof api.mergeFaceDescriptors === 'function', 'face merge core should expose mergeFaceDescriptors');
const base = { instanceId: 'inst-1', semanticFace: 'top', screenFace: 'top', mergePlane: 1, mergeSignature: 'sig', sortKey: 1, tie: 1, cell: { x: 0, y: 0, z: 0 } };
const res = api.mergeFaceDescriptors([
  Object.assign({}, base, { mergeU: 0, mergeV: 0 }),
  Object.assign({}, base, { mergeU: 1, mergeV: 0, cell: { x: 1, y: 0, z: 0 }, sortKey: 2, tie: 2 })
], { enabled: true });
assert(res && Array.isArray(res.descriptors), 'merge result should contain descriptors');
assert(res.descriptors.length === 1, 'adjacent coplanar faces with same signature should merge');
assert(Number(res.descriptors[0].mergeWidth || 0) === 2, 'merged descriptor should stretch across adjacent width');
assert(Number(res.descriptors[0].memberCount || 0) === 2, 'merged descriptor should count contributing faces');
const res2 = api.mergeFaceDescriptors([
  Object.assign({}, base, { mergeU: 0, mergeV: 0, mergeSignature: 'a' }),
  Object.assign({}, base, { mergeU: 1, mergeV: 0, mergeSignature: 'b' })
], { enabled: true });
assert(res2.descriptors.length === 2, 'different merge signatures should not merge');
console.log('static-world-face-merge-core.test.js: OK');
