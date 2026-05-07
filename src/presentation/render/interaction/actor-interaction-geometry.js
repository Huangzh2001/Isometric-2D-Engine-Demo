// P12b-8: actor interaction geometry / group summary boundary.
// Layer: presentation/render/interaction.
// Owns render-facing actor interaction face keys, group summaries, player sort meta, and single-footprint relation geometry only.
// This file must not draw, mutate scene state, emit diagnostics, or own replacement / support-top override pipelines.
(function registerActorInteractionGeometry(global) {
  'use strict';

  var OWNER = {
    phase: 'P12b-8',
    layer: 'presentation/render/interaction',
    owner: 'actor-interaction-geometry',
    responsibility: 'actor interaction face keys, group summaries, player sort meta, and single-footprint relation geometry only'
  };

  function nullFn() { return null; }
  function safeNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }
  function resolveFunction(deps, name, fallback) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    try { if (global && typeof global[name] === 'function') return global[name]; } catch (_) {}
    return fallback || nullFn;
  }
  function normalizeViewRotation(viewRotation, deps) {
    var normalize = resolveFunction(deps, 'normalizeMainEditorViewRotationValue', function (value) { return safeNumber(value, 0); });
    return normalize(viewRotation);
  }

  function buildActorInteractionCellFaceKey(cell, semanticFace, viewRotation, deps) {
    if (!cell) return null;
    var sf = String(semanticFace || '');
    if (!sf) return null;
    var getScreenFaceForSemanticFace = resolveFunction(deps, 'getScreenFaceForSemanticFace', function (face) { return face || ''; });
    var screenFace = getScreenFaceForSemanticFace(sf, normalizeViewRotation(viewRotation, deps));
    return [
      cell.instanceId || 'unknown',
      [safeNumber(cell.x, 0), safeNumber(cell.y, 0), safeNumber(cell.z, 0)].join(','),
      sf,
      screenFace || ''
    ].join('|');
  }

  function getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor) {
    if (!descriptor || typeof descriptor !== 'object') return [];
    if (Array.isArray(descriptor.members) && descriptor.members.length) return descriptor.members.filter(Boolean);
    return [descriptor];
  }

  function buildActorInteractionMemberFaceKeysFromFaceDescriptor(descriptor, viewRotation, deps) {
    var members = getActorInteractionMemberDescriptorsFromFaceDescriptor(descriptor);
    var keys = [];
    for (var i = 0; i < members.length; i++) {
      var m = members[i];
      if (!m) continue;
      var cell = m.cell || m.box || null;
      var sf = String(m.semanticFace || descriptor.semanticFace || '');
      var key = buildActorInteractionCellFaceKey(cell, sf, viewRotation, deps);
      if (key) keys.push(key);
    }
    return keys;
  }

  function getActorInteractionGroupKeyForCell(cell, fallbackInstanceId) {
    var c = cell && typeof cell === 'object' ? cell : {};
    var rawInstanceId = c.instanceId != null ? String(c.instanceId) : (fallbackInstanceId != null ? String(fallbackInstanceId) : '');
    return rawInstanceId || '';
  }

  function buildActorInteractionBoxGroupSummaryMap(sourceBoxes) {
    var map = new Map();
    var boxes = Array.isArray(sourceBoxes) ? sourceBoxes : [];
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i];
      if (!box || typeof box !== 'object') continue;
      var instanceId = box.instanceId != null ? String(box.instanceId) : '';
      var groupKey = getActorInteractionGroupKeyForCell(box, instanceId);
      if (!groupKey) continue;
      var x = Math.floor(safeNumber(box.x, 0));
      var y = Math.floor(safeNumber(box.y, 0));
      var z = Math.floor(safeNumber(box.z, 0));
      var w = Math.max(1, Math.floor(safeNumber(box.w, 1)));
      var d = Math.max(1, Math.floor(safeNumber(box.d, 1)));
      var h = Math.max(1, Math.floor(safeNumber(box.h, 1)));
      var entry = map.get(groupKey);
      if (!entry) {
        entry = {
          instanceId: groupKey,
          sourceInstanceId: instanceId,
          footprintKeys: new Set(),
          minZ: z,
          maxZ: z + h,
          boxCount: 0
        };
        map.set(groupKey, entry);
      }
      entry.boxCount += 1;
      entry.minZ = Math.min(entry.minZ, z);
      entry.maxZ = Math.max(entry.maxZ, z + h);
      for (var dx = 0; dx < w; dx++) {
        for (var dy = 0; dy < d; dy++) {
          entry.footprintKeys.add(String(x + dx) + ',' + String(y + dy));
        }
      }
    }
    return map;
  }

  function buildActorInteractionGroupSummaryMapFromPackets(renderables) {
    var list = Array.isArray(renderables) ? renderables : [];
    var map = new Map();
    for (var i = 0; i < list.length; i++) {
      var packet = list[i];
      if (!packet || packet.kind !== 'static-world-face-packet') continue;
      var members = Array.isArray(packet.actorInteractionMemberDescriptors) && packet.actorInteractionMemberDescriptors.length
        ? packet.actorInteractionMemberDescriptors
        : [packet.box || null];
      for (var mi = 0; mi < members.length; mi++) {
        var member = members[mi];
        var cell = member && (member.cell || member.box || member);
        if (!cell) continue;
        var instanceId = cell.instanceId != null ? String(cell.instanceId) : (packet.instanceId != null ? String(packet.instanceId) : '');
        var groupKey = getActorInteractionGroupKeyForCell(cell, instanceId);
        if (!groupKey) continue;
        var x = Math.floor(safeNumber(cell.x, 0));
        var y = Math.floor(safeNumber(cell.y, 0));
        var z = Math.floor(safeNumber(cell.z, 0));
        var w = Math.max(1, Math.floor(safeNumber(cell.w, 1)));
        var d = Math.max(1, Math.floor(safeNumber(cell.d, 1)));
        var h = Math.max(1, Math.floor(safeNumber(cell.h, 1)));
        var entry = map.get(groupKey);
        if (!entry) {
          entry = {
            instanceId: groupKey,
            sourceInstanceId: instanceId,
            minX: x,
            minY: y,
            maxX: x + w,
            maxY: y + d,
            minZ: z,
            maxZ: z + h,
            footprintKeys: new Set(),
            anchorCellX: x,
            anchorCellY: y
          };
          map.set(groupKey, entry);
        }
        entry.minX = Math.min(entry.minX, x);
        entry.minY = Math.min(entry.minY, y);
        entry.maxX = Math.max(entry.maxX, x + w);
        entry.maxY = Math.max(entry.maxY, y + d);
        entry.minZ = Math.min(entry.minZ, z);
        entry.maxZ = Math.max(entry.maxZ, z + h);
        for (var dx = 0; dx < w; dx++) {
          for (var dy = 0; dy < d; dy++) {
            var fx = x + dx;
            var fy = y + dy;
            entry.footprintKeys.add(String(fx) + ',' + String(fy));
            if (fx < entry.anchorCellX || (fx === entry.anchorCellX && fy < entry.anchorCellY)) {
              entry.anchorCellX = fx;
              entry.anchorCellY = fy;
            }
          }
        }
      }
    }
    return map;
  }

  function projectActorInteractionWorldPointNoCamera(point, viewRotation, deps) {
    var getMainViewRotationCoreApi = resolveFunction(deps, 'getMainViewRotationCoreApi', nullFn);
    var getMainViewProjectionConfigWithoutCamera = resolveFunction(deps, 'getMainViewProjectionConfigWithoutCamera', function () { return { originX: 0, originY: 0, tileW: 64, tileH: 32 }; });
    var api = getMainViewRotationCoreApi();
    var cfg = getMainViewProjectionConfigWithoutCamera() || { originX: 0, originY: 0, tileW: 64, tileH: 32 };
    var p = point && typeof point === 'object' ? point : { x: 0, y: 0, z: 0 };
    if (api && typeof api.worldToScreenWithViewRotation === 'function') {
      var out = api.worldToScreenWithViewRotation({ x: safeNumber(p.x, 0), y: safeNumber(p.y, 0), z: safeNumber(p.z, 0) }, viewRotation, cfg);
      return { x: safeNumber(out && out.x, 0), y: safeNumber(out && out.y, 0) };
    }
    return {
      x: safeNumber(cfg.originX, 0) + (safeNumber(p.x, 0) - safeNumber(p.y, 0)) * safeNumber(cfg.tileW, 64) / 2,
      y: safeNumber(cfg.originY, 0) + (safeNumber(p.x, 0) + safeNumber(p.y, 0)) * safeNumber(cfg.tileH, 32) / 2 - safeNumber(p.z, 0) * safeNumber(cfg.tileH, 32)
    };
  }

  function computeActorInteractionPlayerSortMeta(playerRef, viewRotation, deps) {
    var playerObj = playerRef && typeof playerRef === 'object' ? playerRef : { x: 0, y: 0, z: 0 };
    var getDomainSceneCoreApi = resolveFunction(deps, 'getDomainSceneCoreApi', nullFn);
    var domainCore = getDomainSceneCoreApi();
    if (domainCore && typeof domainCore.computePlayerActorRenderableSort === 'function') {
      return domainCore.computePlayerActorRenderableSort({ player: playerObj, viewRotation: normalizeViewRotation(viewRotation, deps) }) || { sortKey: 0, tie: 700000 };
    }
    var computeViewAwareSortMeta = resolveFunction(deps, 'computeViewAwareSortMeta', function (point, height, rotation) {
      return { sortKey: safeNumber(point && point.x, 0) + safeNumber(point && point.y, 0) + safeNumber(point && point.z, 0) + safeNumber(height, 0) + safeNumber(rotation, 0) * 0.001, tie: 0 };
    });
    var playerZ = safeNumber(playerObj && playerObj.z != null ? playerObj.z : 0, 0);
    var fallback = computeViewAwareSortMeta({ x: safeNumber(playerObj.x, 0), y: safeNumber(playerObj.y, 0), z: playerZ }, 0, normalizeViewRotation(viewRotation, deps)) || {};
    return { sortKey: safeNumber(fallback.sortKey, 0) + 0.0007, tie: 700000 + safeNumber(fallback.tie, 0) };
  }

  function classifyActorInteractionSingleFootprintGroupAgainstPlayer(group, playerRef, viewRotation, deps) {
    if (!group || !playerRef) return 'none';
    var footprintCount = group.footprintKeys && typeof group.footprintKeys.size === 'number' ? group.footprintKeys.size : 0;
    if (footprintCount !== 1) return 'none';
    var px = safeNumber(playerRef.x, 0);
    var py = safeNumber(playerRef.y, 0);
    var pz = safeNumber(playerRef.z, 0);
    var lineZ = safeNumber(group.minZ, 0);
    var left = projectActorInteractionWorldPointNoCamera({ x: safeNumber(group.anchorCellX, 0), y: safeNumber(group.anchorCellY, 0) + 1, z: lineZ }, viewRotation, deps);
    var right = projectActorInteractionWorldPointNoCamera({ x: safeNumber(group.anchorCellX, 0) + 1, y: safeNumber(group.anchorCellY, 0), z: lineZ }, viewRotation, deps);
    var playerFoot = projectActorInteractionWorldPointNoCamera({ x: px, y: py, z: pz }, viewRotation, deps);
    var lineYAtX = resolveFunction(deps, 'lineYAtX', function (a, b, x) {
      var dx = safeNumber(b && b.x, 0) - safeNumber(a && a.x, 0);
      if (Math.abs(dx) < 0.000001) return (safeNumber(a && a.y, 0) + safeNumber(b && b.y, 0)) / 2;
      var t = (safeNumber(x, 0) - safeNumber(a && a.x, 0)) / dx;
      return safeNumber(a && a.y, 0) + t * (safeNumber(b && b.y, 0) - safeNumber(a && a.y, 0));
    });
    var lineY = lineYAtX(left, right, playerFoot.x);
    return playerFoot.y >= lineY ? 'player-in-front' : 'player-behind';
  }

  var api = {
    __owner: OWNER,
    buildActorInteractionCellFaceKey: buildActorInteractionCellFaceKey,
    getActorInteractionMemberDescriptorsFromFaceDescriptor: getActorInteractionMemberDescriptorsFromFaceDescriptor,
    buildActorInteractionMemberFaceKeysFromFaceDescriptor: buildActorInteractionMemberFaceKeysFromFaceDescriptor,
    getActorInteractionGroupKeyForCell: getActorInteractionGroupKeyForCell,
    buildActorInteractionBoxGroupSummaryMap: buildActorInteractionBoxGroupSummaryMap,
    buildActorInteractionGroupSummaryMapFromPackets: buildActorInteractionGroupSummaryMapFromPackets,
    projectActorInteractionWorldPointNoCamera: projectActorInteractionWorldPointNoCamera,
    computeActorInteractionPlayerSortMeta: computeActorInteractionPlayerSortMeta,
    classifyActorInteractionSingleFootprintGroupAgainstPlayer: classifyActorInteractionSingleFootprintGroupAgainstPlayer
  };

  global.IsometricActorInteractionGeometry = api;
  global.__ACTOR_INTERACTION_GEOMETRY__ = api;
  global.__APP_PRESENTATION_ACTOR_INTERACTION_GEOMETRY__ = api;
  if (global.App) {
    global.App.presentation = global.App.presentation || {};
    global.App.presentation.render = global.App.presentation.render || {};
    global.App.presentation.render.interaction = global.App.presentation.render.interaction || {};
    global.App.presentation.render.interaction.actorInteractionGeometry = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);
