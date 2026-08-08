const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const context = {
  console,
  globalThis: null,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  Blob,
  Response,
  CompressionStream: globalThis.CompressionStream,
  DecompressionStream: globalThis.DecompressionStream,
  setTimeout,
  clearTimeout,
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(
  fs.readFileSync('src/infrastructure/assets/unified-material-export.js', 'utf8'),
  context
);

(async () => {
  const api = context.__HZH_UNIFIED_MATERIAL_EXPORT__;
  assert(api, 'export API missing');
  const payload = {
    format: 'hzh-unified-material-v1',
    version: 1,
    name: 'test',
    artwork: { width: 2, height: 2 },
  };
  const built = await api.buildCompressedMaterial(payload);
  assert(built.blob instanceof Blob, 'blob missing');
  assert(built.outputBytes > 0, 'empty output');
  assert(['gzip', 'none'].includes(built.compression));
  const fileLike = { arrayBuffer: () => built.blob.arrayBuffer() };
  const parsed = await api.parseMaterialFile(fileLike);
  assert.strictEqual(parsed.format, payload.format);
  assert.strictEqual(parsed.name, 'test');
  assert.strictEqual(api.sanitizeFilename('a:b/c'), 'a_b_c');
  console.log('unified-material-export.test.js: OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
