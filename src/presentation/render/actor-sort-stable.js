// Stable actor/static face ordering helpers.
//
// This module deliberately does not create, suppress, or split renderables.
// It only returns a same-length renderable list with adjusted sort metadata for
// packets that have a stable player relation. Keeping renderable identities
// stable is essential to avoid flicker while the player crosses tile boundaries.
(function () {
  if (typeof window === 'undefined') return;

  var EPS = 1e-4;

  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function readLocalStorageFlag(name) {
    try {
      if (typeof localStorage === 'undefined') return null;
      return localStorage.getItem(name);
    } catch (_) {
      return null;
    }
  }



  function packetLooksTerrain(packet, cells) {
    if (!packet || typeof packet !== "object") return false;
    if (packet.terrainMaterialMergeKey != null || packet.terrainMaterialId != null || packet.terrainMaterialLabel != null) return true;
    var packetText = String(packet.materialType || packet.terrainBand || packet.prefabId || packet.instanceId || "").toLowerCase();
    if (packetText.indexOf("terrain") >= 0) return true;
    var list = Array.isArray(cells) ? cells : getPacketMemberCells(packet);
    for (var i = 0; i < list.length; i++) {
      var c = list[i];
      if (!c) continue;
      if (c.generatedBy === "terrain-generator" || c.terrain === true || c.isTerrain === true) return true;
      if (c.terrainBand != null || c.terrainMaterialId != null || c.terrainMaterialMergeKey != null) return true;
      var cellText = String(c.materialType || c.prefabId || c.instanceId || "").toLowerCase();
      if (cellText.indexOf("terrain") >= 0) return true;
    }
    return false;
  }

  function isStableDemergeEnabled() {
    return readLocalStorageFlag("stableActorSortDemerge") !== "0";
  }

  function shouldDemergeStaticPacket(packet) {
    if (!isStableActorSortEnabled() || !isStableDemergeEnabled()) return false;
    if (!packet || packet.kind !== "static-world-face-packet") return false;
    var face = String(packet.semanticFace || "");
    if (face !== "top" && face !== "east" && face !== "south" && face !== "west" && face !== "north") return false;
    var members = Array.isArray(packet.actorInteractionMemberDescriptors) ? packet.actorInteractionMemberDescriptors : [];
    if (members.length <= 1) return false;
    if (readLocalStorageFlag("stableActorSortDemergeAll") === "1") return true;
    return packetLooksTerrain(packet, members);
  }


  function isStableActorSortEnabled() {
    // Default to the stable path. Set legacyActorInteractionReplacement=1 only
    // when explicitly debugging the old dynamic suppress/replacement pipeline.
    return readLocalStorageFlag('legacyActorInteractionReplacement') !== '1';
  }

  function getPacketMemberCells(packet) {
    var out = [];
    if (!packet || typeof packet !== 'object') return out;
    var members = Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
      ? packet.actorInteractionMemberDescriptors
      : (Array.isArray(packet.members) && packet.members.length ? packet.members : [packet.box || packet.cell || null]);
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      var cell = m && (m.cell || m.box || m);
      if (cell && typeof cell === 'object') out.push(cell);
    }
    return out;
  }

  function cellBounds(cell) {
    var x = Math.floor(safeNumber(cell && cell.x, 0));
    var y = Math.floor(safeNumber(cell && cell.y, 0));
    var z = safeNumber(cell && cell.z, 0);
    var w = Math.max(1, safeNumber(cell && cell.w != null ? cell.w : 1, 1));
    var d = Math.max(1, safeNumber(cell && cell.d != null ? cell.d : 1, 1));
    var h = Math.max(1, safeNumber(cell && cell.h != null ? cell.h : 1, 1));
    return { x: x, y: y, z: z, w: w, d: d, h: h, topZ: z + h };
  }

  function footOwnsCellTop(player, cell) {
    if (!player || !cell) return false;
    var px = safeNumber(player.x, NaN);
    var py = safeNumber(player.y, NaN);
    var pz = safeNumber(player.z, NaN);
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) return false;
    var b = cellBounds(cell);
    if (Math.abs(b.topZ - pz) > 0.001) return false;
    // Half-open ownership makes adjacent cells deterministic: exactly one cell
    // owns a player foot position on an internal tile boundary.
    return px >= b.x - EPS && px < b.x + b.w - EPS
      && py >= b.y - EPS && py < b.y + b.d - EPS;
  }

  function packetActsAsSupportTop(packet, player) {
    if (!packet || packet.kind !== 'static-world-face-packet') return false;
    if (String(packet.semanticFace || '') !== 'top') return false;
    var cells = getPacketMemberCells(packet);
    for (var i = 0; i < cells.length; i++) {
      if (footOwnsCellTop(player, cells[i])) return true;
    }
    return false;
  }

  function computePlayerSortMeta(player, viewRotation, helpers) {
    var h = helpers && typeof helpers.computePlayerSortMeta === 'function'
      ? helpers.computePlayerSortMeta(player, viewRotation)
      : null;
    if (h && Number.isFinite(Number(h.sortKey))) return h;
    var pz = safeNumber(player && player.z, 0);
    return {
      sortKey: safeNumber(player && player.x, 0) + safeNumber(player && player.y, 0) + pz + 0.0007,
      tie: 700000
    };
  }

  function summarizePacket(packet, helpers) {
    if (helpers && typeof helpers.summarizeRenderable === 'function') {
      try { return helpers.summarizeRenderable(packet); } catch (_) {}
    }
    return {
      id: packet && packet.id || null,
      kind: packet && packet.kind || null,
      semanticFace: packet && packet.semanticFace || null,
      sortKey: packet && packet.sortKey != null ? Number(packet.sortKey) : null,
      tie: packet && packet.tie != null ? Number(packet.tie) : null
    };
  }

  function emitDiag(tag, payload, helpers) {
    if (helpers && typeof helpers.emitDiag === 'function') {
      try { helpers.emitDiag(tag, payload || {}, { maxCount: 6000 }); } catch (_) {}
    }
  }

  function compareByDomain(a, b, helpers) {
    if (helpers && typeof helpers.compareRenderables === 'function') return helpers.compareRenderables(a, b);
    var ak = safeNumber(a && a.sortKey, 0);
    var bk = safeNumber(b && b.sortKey, 0);
    if (Math.abs(ak - bk) > 1e-9) return ak - bk;
    return safeNumber(a && a.tie, 0) - safeNumber(b && b.tie, 0);
  }

  function applyStablePlayerFaceSort(options) {
    var safe = options && typeof options === 'object' ? options : {};
    var list = Array.isArray(safe.staticRenderables) ? safe.staticRenderables : [];
    var player = safe.player && typeof safe.player === 'object' ? safe.player : null;
    var helpers = safe.helpers || {};
    var viewRotation = safe.viewRotation;
    if (!list.length || !player || !isStableActorSortEnabled()) {
      return { staticRenderables: list, overrideCount: 0, overrideSamples: [], mode: isStableActorSortEnabled() ? 'stable-no-player' : 'legacy-disabled' };
    }

    var playerSortMeta = computePlayerSortMeta(player, viewRotation, helpers);
    var out = list.slice();
    var overrideCount = 0;
    var samples = [];

    for (var i = 0; i < out.length; i++) {
      var packet = out[i];
      if (!packetActsAsSupportTop(packet, player)) continue;
      var originalTie = safeNumber(packet && packet.tie, 0);
      var clone = Object.assign({}, packet, {
        sortKey: safeNumber(playerSortMeta.sortKey, 0) - 0.0012,
        tie: safeNumber(playerSortMeta.tie, 700000) - 120 + ((Math.abs(originalTie) % 1000) * 0.000001),
        actorStableSortOverride: true,
        actorStableSortRelation: 'support-top-before-player',
        actorInteractionSupportTopSortOverride: true,
        actorInteractionSupportFloor: true,
        actorInteractionGroupSortRelation: 'support-top-before-player',
        actorInteractionGroupFootprintMode: 'stable-support-top-no-split',
        renderPath: String(packet && packet.renderPath || 'static-world-chunk-packet') + '+stable-actor-sort-support-top'
      });
      out[i] = clone;
      overrideCount += 1;
      if (samples.length < 16) samples.push(summarizePacket(clone, helpers));
    }

    if (overrideCount > 0) out.sort(function (a, b) { return compareByDomain(a, b, helpers); });
    if (overrideCount > 0) {
      emitDiag('stable-support-top-sort-override', {
        viewRotation: viewRotation,
        mode: 'stable-renderable-identity',
        player: helpers && typeof helpers.summarizePlayer === 'function' ? helpers.summarizePlayer(player) : { x: player.x, y: player.y, z: player.z },
        inputStaticRenderableCount: list.length,
        outputStaticRenderableCount: out.length,
        overrideCount: overrideCount,
        samples: samples
      }, helpers);
    }

    return { staticRenderables: out, overrideCount: overrideCount, overrideSamples: samples, mode: 'stable-renderable-identity' };
  }

  window.__ACTOR_SORT_STABLE__ = {
    version: 'stable-actor-sort-v1-20260428',
    isEnabled: isStableActorSortEnabled,
    getPacketMemberCells: getPacketMemberCells,
    packetLooksTerrain: packetLooksTerrain,
    isStableDemergeEnabled: isStableDemergeEnabled,
    shouldDemergeStaticPacket: shouldDemergeStaticPacket,
    packetActsAsSupportTop: packetActsAsSupportTop,
    applyStablePlayerFaceSort: applyStablePlayerFaceSort
  };
})();
