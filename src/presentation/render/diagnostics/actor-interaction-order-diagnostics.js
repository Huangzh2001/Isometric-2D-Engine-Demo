// P12b-5 owner: actor interaction order diagnostics.
// Layer: presentation/render/diagnostics.
//
// Owns actor-sort diagnostic runtime state, flags, payload summarizers, and
// export-channel logging. It must not own actor interaction sorting/replacement
// rules, renderable construction, drawing, or frame-plan orchestration.
(function registerActorInteractionOrderDiagnostics(global) {
  var ACTOR_INTERACTION_SORT_RADIUS = 2;

  var runtimeState = {
    version: 'actor-sort-diag-v2-export-channel-20260428',
    lastCandidateSignature: '',
    lastReplacementSignature: '',
    lastFinalOrderSignature: '',
    emittedCount: 0,
    renderEntryCount: 0,
    lastEnabledCheck: false,
    lastEmitTag: '',
    lastEmitAt: 0,
    lastExportChannel: ''
  };

  function getRuntimeState() {
    return runtimeState;
  }

  function getActorInteractionSortRadiusForRender() {
    return Math.max(1, Number(ACTOR_INTERACTION_SORT_RADIUS || 2));
  }

  function getGlobalFlag(name) {
    try { return !!(global && global[name] === true); } catch (_) { return false; }
  }

  function getStorageItem(name) {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(name);
    } catch (_) {}
    return null;
  }

  function isActorInteractionOrderDiagEnabled() {
    var enabled = false;
    if (getGlobalFlag('__TERRAIN_PLAYER_DIAG__')) enabled = true;
    if (getGlobalFlag('__ACTOR_SORT_DIAG__')) enabled = true;
    if (!enabled) {
      var a = getStorageItem('terrainPlayerDiag');
      var b = getStorageItem('actorSortDiag');
      var c = getStorageItem('terrainSortDiag');
      enabled = a === '1' || a === 'true' || b === '1' || b === 'true' || c === '1' || c === 'true';
    }
    try { runtimeState.lastEnabledCheck = !!enabled; } catch (_) {}
    return !!enabled;
  }

  function emitActorInteractionOrderDiag(tag, payload, options) {
    if (!isActorInteractionOrderDiagEnabled()) return;
    var opts = options && typeof options === 'object' ? options : {};
    var maxCount = Number(opts.maxCount || 4000);
    if (runtimeState.emittedCount >= maxCount) return;
    runtimeState.emittedCount += 1;
    var text = '';
    try { text = JSON.stringify(payload || {}); } catch (_) { text = '"[unserializable]"'; }
    var line = '[actor-sort-diag][' + String(tag || 'event') + '] ' + text;
    try {
      runtimeState.lastEmitTag = String(tag || 'event');
      runtimeState.lastEmitAt = Date.now ? Date.now() : 0;
    } catch (_) {}
    try {
      if (typeof pushLog === 'function') {
        runtimeState.lastExportChannel = 'pushLog';
        pushLog(line);
      } else if (typeof logInfo === 'function') {
        runtimeState.lastExportChannel = 'logInfo';
        logInfo(line);
      } else if (typeof detailLog === 'function') {
        runtimeState.lastExportChannel = 'detailLog';
        detailLog(line);
      } else if (global && typeof global.__forceExportLog === 'function') {
        runtimeState.lastExportChannel = 'window.__forceExportLog';
        global.__forceExportLog(line);
      } else {
        runtimeState.lastExportChannel = 'console-only';
      }
    } catch (_) {}
    try {
      if (typeof console !== 'undefined' && console.log) console.log('[actor-sort-diag][' + String(tag || 'event') + ']', payload || {});
    } catch (_) {}
  }

  function getActorInteractionDiagStorageSnapshotForRender() {
    var out = { actorSortDiag: null, terrainPlayerDiag: null, terrainSortDiag: null };
    try {
      if (typeof localStorage !== 'undefined') {
        out.actorSortDiag = localStorage.getItem('actorSortDiag');
        out.terrainPlayerDiag = localStorage.getItem('terrainPlayerDiag');
        out.terrainSortDiag = localStorage.getItem('terrainSortDiag');
      }
    } catch (_) {
      out.actorSortDiag = 'error';
      out.terrainPlayerDiag = 'error';
      out.terrainSortDiag = 'error';
    }
    return out;
  }

  function noteActorInteractionRenderEntryForRender(payload) {
    if (!isActorInteractionOrderDiagEnabled()) return false;
    runtimeState.renderEntryCount += 1;
    var count = Number(runtimeState.renderEntryCount || 0);
    if (!(count <= 8 || (count % 120) === 0)) return false;
    var safe = payload && typeof payload === 'object' ? payload : {};
    var storage = getActorInteractionDiagStorageSnapshotForRender();
    emitActorInteractionOrderDiag('render-entry', {
      version: runtimeState.version,
      renderEntryCount: count,
      hasPushLog: safe.hasPushLog === true,
      hasForceExportLog: safe.hasForceExportLog === true,
      localStorageActorSortDiag: storage.actorSortDiag,
      localStorageTerrainPlayerDiag: storage.terrainPlayerDiag,
      localStorageTerrainSortDiag: storage.terrainSortDiag,
      totalInstances: Number(safe.totalInstances || 0),
      totalBoxes: Number(safe.totalBoxes || 0)
    }, { maxCount: 1000 });
    return true;
  }

  function roundActorDiagNumber(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) return null;
    var scale = Math.pow(10, digits == null ? 3 : digits);
    return Math.round(n * scale) / scale;
  }

  function isActorDiagTerrainCell(cell) {
    var c = cell && typeof cell === 'object' ? cell : {};
    return c.generatedBy === 'terrain-generator'
      || c.isTerrain === true
      || c.terrainGenerated === true
      || c.terrainBatchId != null
      || c.terrainMaterialId != null
      || c.terrainBand != null
      || String(c.instanceId || '').indexOf('terrain-') === 0;
  }

  function getPlayerFromDeps(deps) {
    try { if (deps && typeof deps.getPlayerForActorInteractionDiagnostics === 'function') return deps.getPlayerForActorInteractionDiagnostics(); } catch (_) {}
    try { if (global && global.player) return global.player; } catch (_) {}
    return null;
  }

  function normalizeViewRotation(viewRotation, deps) {
    try {
      if (deps && typeof deps.normalizeMainEditorViewRotationValue === 'function') return deps.normalizeMainEditorViewRotationValue(viewRotation);
    } catch (_) {}
    var n = Number(viewRotation || 0);
    if (!Number.isFinite(n)) n = 0;
    return ((n % 4) + 4) % 4;
  }

  function summarizeActorDiagPlayer(playerRef, deps) {
    var p = playerRef && typeof playerRef === 'object' ? playerRef : getPlayerFromDeps(deps);
    p = p || {};
    return {
      x: roundActorDiagNumber(p && p.x, 3),
      y: roundActorDiagNumber(p && p.y, 3),
      z: roundActorDiagNumber(p && p.z, 3),
      visualZ: roundActorDiagNumber(p && p.visualZ, 3),
      moving: !!(p && p.moving),
      dir: p && p.dir != null ? String(p.dir) : null,
      jumpActive: !!(p && p.jump && p.jump.active),
      jumpMode: p && p.jump && p.jump.mode != null ? String(p.jump.mode) : null,
      jumpFromZ: roundActorDiagNumber(p && p.jump && p.jump.fromZ, 3),
      jumpToZ: roundActorDiagNumber(p && p.jump && p.jump.toZ, 3),
      jumpT: roundActorDiagNumber(p && p.jump && p.jump.t, 3)
    };
  }

  function summarizeActorDiagCell(cell) {
    if (!cell || typeof cell !== 'object') return null;
    return {
      id: cell.id != null ? String(cell.id) : null,
      instanceId: cell.instanceId != null ? String(cell.instanceId) : null,
      prefabId: cell.prefabId != null ? String(cell.prefabId) : null,
      x: roundActorDiagNumber(cell.x, 3),
      y: roundActorDiagNumber(cell.y, 3),
      z: roundActorDiagNumber(cell.z, 3),
      w: roundActorDiagNumber(cell.w != null ? cell.w : 1, 3),
      d: roundActorDiagNumber(cell.d != null ? cell.d : 1, 3),
      h: roundActorDiagNumber(cell.h != null ? cell.h : 1, 3),
      topZ: roundActorDiagNumber(Number(cell.z || 0) + Number(cell.h != null ? cell.h : 1), 3),
      terrain: isActorDiagTerrainCell(cell),
      terrainBatchId: cell.terrainBatchId != null ? String(cell.terrainBatchId) : null,
      terrainBand: cell.terrainBand != null ? String(cell.terrainBand) : null
    };
  }

  function summarizeActorDiagRenderable(renderable) {
    if (!renderable || typeof renderable !== 'object') return null;
    var cell = renderable.box || renderable.cell || null;
    return {
      id: renderable.id != null ? String(renderable.id).slice(0, 180) : null,
      kind: renderable.kind != null ? String(renderable.kind) : null,
      semanticFace: renderable.semanticFace != null ? String(renderable.semanticFace) : null,
      screenFace: renderable.screenFace != null ? String(renderable.screenFace) : null,
      instanceId: renderable.instanceId != null ? String(renderable.instanceId) : null,
      prefabId: renderable.prefabId != null ? String(renderable.prefabId) : null,
      sortKey: roundActorDiagNumber(renderable.sortKey, 6),
      tie: roundActorDiagNumber(renderable.tie, 6),
      depthKey: roundActorDiagNumber(renderable.depthKey, 6),
      mergedFace: renderable.mergedFace === true,
      mergedFaceCount: roundActorDiagNumber(renderable.mergedFaceCount, 0),
      mergeWidth: roundActorDiagNumber(renderable.mergeWidth, 0),
      mergeHeight: roundActorDiagNumber(renderable.mergeHeight, 0),
      actorReplacement: renderable.actorInteractionReplacement === true,
      actorSupportFloor: renderable.actorInteractionSupportFloor === true,
      actorRelation: renderable.actorInteractionGroupSortRelation != null ? String(renderable.actorInteractionGroupSortRelation) : null,
      actorFootprintMode: renderable.actorInteractionGroupFootprintMode != null ? String(renderable.actorInteractionGroupFootprintMode) : null,
      memberKeyCount: Array.isArray(renderable.actorInteractionMemberFaceKeys) ? renderable.actorInteractionMemberFaceKeys.length : 0,
      renderPath: renderable.renderPath != null ? String(renderable.renderPath) : null,
      cell: summarizeActorDiagCell(cell)
    };
  }

  function summarizeActorDiagFaceKeySet(faceKeySet, limit) {
    var keys = [];
    if (!faceKeySet || typeof faceKeySet.forEach !== 'function') return keys;
    var max = Math.max(1, Number(limit || 24));
    faceKeySet.forEach(function (key) {
      if (keys.length < max) keys.push(String(key));
    });
    return keys;
  }

  function getActorDiagFaceKeyCountsByFace(faceKeySet) {
    var out = Object.create(null);
    if (!faceKeySet || typeof faceKeySet.forEach !== 'function') return out;
    faceKeySet.forEach(function (key) {
      var parts = String(key || '').split('|');
      var face = parts.length >= 3 ? parts[2] : 'unknown';
      out[face] = (out[face] || 0) + 1;
    });
    return out;
  }

  function summarizeActorDiagNearbyBoxes(playerRef, sourceBoxes, radius, limit) {
    var out = [];
    var p = playerRef && typeof playerRef === 'object' ? playerRef : null;
    var boxesList = Array.isArray(sourceBoxes) ? sourceBoxes : [];
    if (!p || !boxesList.length) return out;
    var px = Number(p.x || 0);
    var py = Number(p.y || 0);
    var pz = Number(p.z || 0);
    var r = Math.max(1, Number(radius || 2));
    var max = Math.max(1, Number(limit || 20));
    for (var i = 0; i < boxesList.length; i++) {
      var b = boxesList[i];
      if (!b) continue;
      var bx = Number(b.x || 0);
      var by = Number(b.y || 0);
      var bz = Number(b.z || 0);
      var bw = Math.max(1, Number(b.w || 1));
      var bd = Math.max(1, Number(b.d || 1));
      var bh = Math.max(1, Number(b.h || 1));
      var nearestX = Math.max(bx, Math.min(px, bx + bw));
      var nearestY = Math.max(by, Math.min(py, by + bd));
      var distXY = Math.hypot(nearestX - px, nearestY - py);
      var topZ = bz + bh;
      if (distXY > r + 1.25) continue;
      if (topZ < pz - 2 || bz > pz + 3) continue;
      out.push(Object.assign({
        distXY: roundActorDiagNumber(distXY, 3),
        verticalDeltaTopMinusPlayerZ: roundActorDiagNumber(topZ - pz, 3)
      }, summarizeActorDiagCell(b)));
    }
    out.sort(function (a, b) {
      if (Math.abs(Number(a.verticalDeltaTopMinusPlayerZ || 0)) !== Math.abs(Number(b.verticalDeltaTopMinusPlayerZ || 0))) return Math.abs(Number(a.verticalDeltaTopMinusPlayerZ || 0)) - Math.abs(Number(b.verticalDeltaTopMinusPlayerZ || 0));
      return Number(a.distXY || 0) - Number(b.distXY || 0);
    });
    return out.slice(0, max);
  }

  function summarizeActorDiagReplacementRelations(replacements) {
    var out = Object.create(null);
    var list = Array.isArray(replacements) ? replacements : [];
    for (var i = 0; i < list.length; i++) {
      var r = list[i] || {};
      var relation = String(r.actorInteractionGroupSortRelation || 'none');
      var face = String(r.semanticFace || 'unknown');
      var terrainSuffix = isActorDiagTerrainCell(r.box || r.cell || null) ? ':terrain' : ':normal';
      var key = relation + ':' + face + terrainSuffix;
      out[key] = (out[key] || 0) + 1;
    }
    return out;
  }

  function shouldEmitActorInteractionDiagSignature(channel, signature) {
    var key = 'last' + String(channel || '').replace(/(^|-)([a-z])/g, function (_, _dash, letter) { return String(letter || '').toUpperCase(); }) + 'Signature';
    if (!key || !(key in runtimeState)) return true;
    if (runtimeState[key] === signature) return false;
    runtimeState[key] = signature;
    return true;
  }

  function logActorInteractionFinalOrderDiagnostics(framePlanId, viewRotation, order, deps) {
    if (!isActorInteractionOrderDiagEnabled()) return;
    var list = Array.isArray(order) ? order : [];
    var playerIndex = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === 'player-avatar') { playerIndex = i; break; }
    }
    var p = getPlayerFromDeps(deps);
    var px = Number(p && p.x || 0);
    var py = Number(p && p.y || 0);
    var pz = Number(p && p.z || 0);
    var windowItems = [];
    var start = Math.max(0, playerIndex - 10);
    var end = Math.min(list.length, playerIndex + 11);
    if (playerIndex < 0) { start = 0; end = Math.min(list.length, 24); }
    for (var wi = start; wi < end; wi++) {
      windowItems.push(Object.assign({ index: wi, relativeToPlayer: playerIndex >= 0 ? wi - playerIndex : null }, summarizeActorDiagRenderable(list[wi]) || {}));
    }
    var nearbyFaces = [];
    var supportTopFaces = [];
    for (var ri = 0; ri < list.length; ri++) {
      var r = list[ri];
      if (!r || r.kind === 'player-avatar') continue;
      var c = r.box || r.cell || null;
      if (!c) continue;
      var cx = Number(c.x || 0);
      var cy = Number(c.y || 0);
      var cw = Math.max(1, Number(c.w || 1));
      var cd = Math.max(1, Number(c.d || 1));
      var cz = Number(c.z || 0);
      var ch = Math.max(1, Number(c.h || 1));
      var centerX = cx + cw * 0.5;
      var centerY = cy + cd * 0.5;
      var nearXY = Math.abs(centerX - px) <= 2.75 && Math.abs(centerY - py) <= 2.75;
      if (!nearXY) continue;
      var item = Object.assign({ index: ri, relativeToPlayer: playerIndex >= 0 ? ri - playerIndex : null }, summarizeActorDiagRenderable(r) || {});
      if (nearbyFaces.length < 36) nearbyFaces.push(item);
      if (String(r.semanticFace || '') === 'top' && Math.abs((cz + ch) - pz) <= 0.001 && supportTopFaces.length < 16) supportTopFaces.push(item);
    }
    var signature = [framePlanId, playerIndex, roundActorDiagNumber(px, 2), roundActorDiagNumber(py, 2), roundActorDiagNumber(pz, 2), list.length, supportTopFaces.map(function (it) { return [it.index, it.relativeToPlayer, it.id].join(':'); }).join(';')].join('|');
    if (!shouldEmitActorInteractionDiagSignature('final-order', signature)) return;
    emitActorInteractionOrderDiag('final-order-window', {
      framePlanId: framePlanId,
      viewRotation: normalizeViewRotation(viewRotation, deps),
      renderableCount: list.length,
      playerIndex: playerIndex,
      player: summarizeActorDiagPlayer(p, deps),
      supportTopFaceCount: supportTopFaces.length,
      supportTopFaces: supportTopFaces,
      window: windowItems,
      nearbyFaces: nearbyFaces
    });
  }

  var api = {
    layer: 'presentation/render/diagnostics',
    phase: 'P12b-5',
    getRuntimeState: getRuntimeState,
    getActorInteractionSortRadiusForRender: getActorInteractionSortRadiusForRender,
    isActorInteractionOrderDiagEnabled: isActorInteractionOrderDiagEnabled,
    emitActorInteractionOrderDiag: emitActorInteractionOrderDiag,
    getActorInteractionDiagStorageSnapshotForRender: getActorInteractionDiagStorageSnapshotForRender,
    noteActorInteractionRenderEntryForRender: noteActorInteractionRenderEntryForRender,
    roundActorDiagNumber: roundActorDiagNumber,
    isActorDiagTerrainCell: isActorDiagTerrainCell,
    summarizeActorDiagPlayer: summarizeActorDiagPlayer,
    summarizeActorDiagCell: summarizeActorDiagCell,
    summarizeActorDiagRenderable: summarizeActorDiagRenderable,
    summarizeActorDiagFaceKeySet: summarizeActorDiagFaceKeySet,
    getActorDiagFaceKeyCountsByFace: getActorDiagFaceKeyCountsByFace,
    summarizeActorDiagNearbyBoxes: summarizeActorDiagNearbyBoxes,
    summarizeActorDiagReplacementRelations: summarizeActorDiagReplacementRelations,
    shouldEmitActorInteractionDiagSignature: shouldEmitActorInteractionDiagSignature,
    logActorInteractionFinalOrderDiagnostics: logActorInteractionFinalOrderDiagnostics
  };

  global.IsometricActorInteractionOrderDiagnostics = api;
  global.__ACTOR_INTERACTION_ORDER_DIAGNOSTICS__ = api;
  global.__APP_PRESENTATION_ACTOR_INTERACTION_ORDER_DIAGNOSTICS__ = api;
  global.__ACTOR_SORT_DIAG_RUNTIME__ = runtimeState;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
