(function (global) {
  'use strict';

  var VERSION = 'HZH-UNIFIED-MATERIAL-EXPORT-V1';

  function sanitizeFilename(name) {
    var value = String(name || 'material').trim().replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_');
    return value || 'material';
  }

  function utf8Bytes(text) {
    return new TextEncoder().encode(String(text || ''));
  }

  async function gzipBytes(bytes) {
    if (typeof CompressionStream !== 'function') return null;
    var stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  function triggerDownload(blob, filename) {
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  async function buildCompressedMaterial(packageData) {
    var json = JSON.stringify(packageData);
    var bytes = utf8Bytes(json);
    var compressed = await gzipBytes(bytes);
    if (compressed) {
      return {
        blob: new Blob([compressed], { type: 'application/gzip' }),
        extension: '.hzhmat',
        compression: 'gzip',
        rawBytes: bytes.byteLength,
        outputBytes: compressed.byteLength
      };
    }
    return {
      blob: new Blob([json], { type: 'application/json;charset=utf-8' }),
      extension: '.hzhmat.json',
      compression: 'none',
      rawBytes: bytes.byteLength,
      outputBytes: bytes.byteLength
    };
  }

  async function exportMaterial(packageData, name) {
    var result = await buildCompressedMaterial(packageData);
    var filename = sanitizeFilename(name) + result.extension;
    triggerDownload(result.blob, filename);
    return Object.assign({ filename: filename }, result);
  }

  async function parseMaterialFile(file) {
    if (!file) throw new Error('missing material file');
    var buffer = await file.arrayBuffer();
    var bytes = new Uint8Array(buffer);
    var text;
    var isGzip = bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
    if (isGzip) {
      if (typeof DecompressionStream !== 'function') throw new Error('当前浏览器不支持 gzip 解压');
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
      text = await new Response(stream).text();
    } else {
      text = new TextDecoder().decode(bytes);
    }
    var parsed = JSON.parse(text);
    if (!parsed || parsed.format !== 'hzh-unified-material-v1') throw new Error('不是 hzh-unified-material-v1 素材文件');
    return parsed;
  }

  var api = {
    VERSION: VERSION,
    buildCompressedMaterial: buildCompressedMaterial,
    exportMaterial: exportMaterial,
    parseMaterialFile: parseMaterialFile,
    triggerDownload: triggerDownload,
    sanitizeFilename: sanitizeFilename
  };

  global.__HZH_UNIFIED_MATERIAL_EXPORT__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('infrastructure.unifiedMaterialExport', api, { owner: 'src/infrastructure/assets/unified-material-export.js', phase: 'asset-editor-v2' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
