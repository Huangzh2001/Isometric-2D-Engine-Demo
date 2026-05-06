#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/infrastructure/assets/habbo-asset-file-service.js'), 'utf8');
const sandbox = { console, globalThis: null };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: 'habbo-asset-file-service.js' });
const service = sandbox.__HABBO_ASSET_FILE_SERVICE__;
if (!service || service.owner !== 'src/infrastructure/assets/habbo-asset-file-service.js') throw new Error('missing owner export');
(async () => {
  let requested = '';
  const buffer = await service.fetchHabboAssetFileBuffer('room/foo.swf', {
    normalizeHabboRelativePathClient: (p) => String(p || '').replace(/^\/+/, ''),
    getHabboApiAdapter: () => ({
      fetchFileBuffer: async (rel) => {
        requested = rel;
        return { response: { ok: true, status: 200 }, buffer: Buffer.from('ok') };
      }
    })
  });
  if (requested !== 'room/foo.swf') throw new Error('relative path was not passed to habbo api');
  if (!Buffer.isBuffer(buffer) || buffer.toString() !== 'ok') throw new Error('buffer result mismatch');
  let threw = false;
  try {
    await service.fetchHabboAssetFileBuffer('', {
      normalizeHabboRelativePathClient: () => '',
      getHabboApiAdapter: () => ({ fetchFileBuffer: async () => ({ response: { ok: true }, buffer: null }) })
    });
  } catch (err) { threw = /缺少 Habbo 资源相对路径/.test(String(err.message)); }
  if (!threw) throw new Error('missing relative path should throw controlled error');
  console.log('PASS habbo-asset-file-service-boundary');
})().catch((err) => { console.error(err); process.exit(1); });
