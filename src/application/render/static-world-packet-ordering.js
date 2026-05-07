// Application render helper for static world packet identity and ordering.
// Owns packet IDs, face keys, and packet ordering for static world packets.
// No DOM, no canvas context, no Image, no storage, no platform API.

(function (global) {
  'use strict';

  var OWNER = 'src/application/render/static-world-packet-ordering.js';
  var PHASE = 'P12C-STATIC-WORLD-PACKET-ORDERING';

  function defaultPerfNow() {
    try { if (global && global.performance && typeof global.performance.now === 'function') return global.performance.now(); } catch (_) {}
    return Date.now();
  }
  function defaultCompareRenderablesByDomain(a, b) {
    var ak = Number(a && a.sortKey || 0);
    var bk = Number(b && b.sortKey || 0);
    if (ak !== bk) return ak - bk;
    return Number(a && a.tie || 0) - Number(b && b.tie || 0);
  }
  function buildStaticWorldPacketIdentity(descriptor, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var cell = opts.cell || (descriptor && (descriptor.cell || descriptor.box)) || null;
    var semanticFace = String(opts.semanticFace || (descriptor && descriptor.semanticFace) || 'top');
    var screenFace = String(opts.screenFace || (descriptor && descriptor.screenFace) || semanticFace);
    var terrainLoopSignature = opts.terrainLoopSignature || '';
    if (!cell) return { packetId: 'voxel-missing::' + semanticFace, faceKey: ['unknown', 'missing', semanticFace, screenFace].join('|') };
    var packetId = descriptor && descriptor.merged === true
      ? 'voxel-merge-' + String(cell.instanceId || cell.prefabId || 'x') + '-' + String(descriptor.mergePlane) + '-' + String(descriptor.mergeU) + '-' + String(descriptor.mergeV) + '-' + String(descriptor.mergeWidth || 1) + 'x' + String(descriptor.mergeHeight || 1) + '-' + String(descriptor.memberCount || 1) + '-' + String(terrainLoopSignature || '') + '::' + semanticFace
      : 'voxel-' + String(cell.id || 'x') + '-' + String(cell.x || 0) + '-' + String(cell.y || 0) + '-' + String(cell.z || 0) + '::' + semanticFace;
    var faceKey = descriptor && descriptor.merged === true
      ? [cell.instanceId || 'unknown', [Number(descriptor.mergePlane || 0), Number(descriptor.mergeU || 0), Number(descriptor.mergeV || 0), Number(descriptor.mergeWidth || 1), Number(descriptor.mergeHeight || 1), Number(descriptor.memberCount || 1)].join(','), terrainLoopSignature || '', semanticFace, screenFace].join('|')
      : [cell.instanceId || 'unknown', [Number(cell.x || 0), Number(cell.y || 0), Number(cell.z || 0)].join(','), semanticFace, screenFace].join('|');
    return {
      packetId: packetId,
      faceKey: faceKey,
      sortKey: Number(descriptor && descriptor.sortKey || 0),
      tie: Number(descriptor && descriptor.tie || 0),
      terrainSortBandKey: descriptor && descriptor.terrainSortBandKey != null ? descriptor.terrainSortBandKey : null
    };
  }
  function sortStaticWorldPackets(packets, options) {
    var list = Array.isArray(packets) ? packets : [];
    var opts = options && typeof options === 'object' ? options : {};
    var compareRenderablesByDomain = typeof opts.compareRenderablesByDomain === 'function'
      ? opts.compareRenderablesByDomain
      : defaultCompareRenderablesByDomain;
    var perfNow = typeof opts.perfNow === 'function' ? opts.perfNow : defaultPerfNow;
    var startAt = perfNow();
    list.sort(compareRenderablesByDomain);
    return {
      packets: list,
      sortMs: Math.max(0, perfNow() - startAt),
      packetCount: list.length
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    buildStaticWorldPacketIdentity: buildStaticWorldPacketIdentity,
    sortStaticWorldPackets: sortStaticWorldPackets,
    summarizeBoundary: function () {
      return { owner: OWNER, phase: PHASE, layer: 'application/render', input: 'static world packets', output: 'packet identity and ordered packets', forbidden: ['ctx', 'canvas', 'document', 'Image', 'localStorage', 'fetch'] };
    }
  };

  try {
    global.__STATIC_WORLD_PACKET_ORDERING__ = api;
    global.__APP_APPLICATION_STATIC_WORLD_PACKET_ORDERING__ = api;
    global.IsometricStaticWorldPacketOrdering = api;
    global.App = global.App || {};
    global.App.application = global.App.application || {};
    global.App.application.render = global.App.application.render || {};
    global.App.application.render.staticWorldPacketOrdering = api;
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
