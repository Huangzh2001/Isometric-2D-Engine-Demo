(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/fluid-rules-core.js';
  var PHASE = 'FLUID-RULES-V1D-EMPTY-CELL-GRAVITY-FIRST';
  var EPS = 1e-9;
  var DIRS_8 = [
    { dx: 1, dy: 0, diagonal: false },
    { dx: -1, dy: 0, diagonal: false },
    { dx: 0, dy: 1, diagonal: false },
    { dx: 0, dy: -1, diagonal: false },
    { dx: 1, dy: 1, diagonal: true },
    { dx: 1, dy: -1, diagonal: true },
    { dx: -1, dy: 1, diagonal: true },
    { dx: -1, dy: -1, diagonal: true }
  ];

  function toNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, toNumber(value, min)));
  }

  function normalizeLayerCount(value) {
    var n = Math.round(toNumber(value, 4));
    if (n < 2) n = 2;
    if (n > 64) n = 64;
    if (n % 2 !== 0) n += 1;
    if (n > 64) n = 64;
    return n;
  }

  function normalizeParams(params) {
    var p = params && typeof params === 'object' ? params : {};
    return {
      layerCount: normalizeLayerCount(p.layerCount),
      flowRate: clamp(p.flowRate == null ? 0.2 : p.flowRate, 0, 1),
      maxFlowPerTick: clamp(p.maxFlowPerTick == null ? 0.08 : p.maxFlowPerTick, 0, 1),
      minDiff: clamp(p.minDiff == null ? 0.03 : p.minDiff, 0, 1),
      diagonalEnabled: p.diagonalEnabled !== false,
      diagonalWeight: clamp(p.diagonalWeight == null ? 0.7 : p.diagonalWeight, 0, 1),
      gravityEnabled: p.gravityEnabled !== false,
      gravityMaxFlowPerTick: clamp(p.gravityMaxFlowPerTick == null ? 1 : p.gravityMaxFlowPerTick, 0, 1),
      deleteBelow: clamp(p.deleteBelow == null ? 0.005 : p.deleteBelow, 0, 0.25),
      capacity: clamp(p.capacity == null ? 1 : p.capacity, 0.01, 1),
      minZ: Math.round(toNumber(p.minZ, 0))
    };
  }

  function cellKey(x, y, z) {
    return Math.round(toNumber(x, 0)) + ',' + Math.round(toNumber(y, 0)) + ',' + Math.round(toNumber(z, 0));
  }

  function isLiquidPrefabId(id) { return String(id || '').indexOf('liquid_water') === 0; }

  function isLiquidBox(box) {
    if (!box || typeof box !== 'object') return false;
    var shapeKind = String(box.shapeKind || '').toLowerCase();
    var liquidType = String(box.liquidType || box.fluidType || '').toLowerCase();
    return shapeKind === 'liquid_water' || liquidType === 'water' || isLiquidPrefabId(box.prefabId);
  }

  function isLiquidInstance(inst) {
    if (!inst || typeof inst !== 'object') return false;
    var kind = String(inst.kind || '').toLowerCase();
    var liquidType = String(inst.liquidType || inst.fluidType || '').toLowerCase();
    return kind === 'liquid_water' || liquidType === 'water' || isLiquidPrefabId(inst.prefabId) || inst.fluidRuntime === true || inst.fluidRenderPrototype === true;
  }

  function getAmountFromBox(box) {
    if (!box) return 0;
    if (box.waterAmount != null) return clamp(box.waterAmount, 0, 1);
    if (box.fluidAmount != null) return clamp(box.fluidAmount, 0, 1);
    if (box.liquidDepth != null) return clamp(box.liquidDepth, 0, 1);
    if (box.h != null) return clamp(box.h, 0, 1);
    return 0;
  }

  function buildBoxesByInstance(boxes) {
    var out = {};
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      var id = String(b.instanceId || '');
      if (!id) continue;
      if (!out[id]) out[id] = [];
      out[id].push(b);
    }
    return out;
  }

  function getAmountFromInstance(inst, boxesByInstance) {
    if (!inst) return 0;
    if (inst.waterAmount != null) return clamp(inst.waterAmount, 0, 1);
    if (inst.fluidAmount != null) return clamp(inst.fluidAmount, 0, 1);
    if (inst.liquidDepth != null) return clamp(inst.liquidDepth, 0, 1);
    if (inst.renderWaterLevel != null) return clamp(inst.renderWaterLevel, 0, 1);
    var list = boxesByInstance && boxesByInstance[String(inst.instanceId || '')] || [];
    for (var i = 0; i < list.length; i++) if (isLiquidBox(list[i])) return getAmountFromBox(list[i]);
    return 0;
  }

  function quantizeRenderLevel(amount, layerCount) {
    var n = normalizeLayerCount(layerCount);
    var a = clamp(amount, 0, 1);
    if (a <= 0) return 0;
    var q = Math.round(a * n) / n;
    if (q <= 0) q = 1 / n;
    return clamp(q, 0, 1);
  }

  function liquidWaterLayerPrefabIdForAmount(amount, layerCount) {
    var n = normalizeLayerCount(layerCount);
    var q = quantizeRenderLevel(amount, n);
    var i = Math.max(1, Math.min(n, Math.round(q * n)));
    if (n === 4) {
      if (i === 1) return 'liquid_water_025';
      if (i === 2) return 'liquid_water_050';
      if (i === 3) return 'liquid_water_075';
      return 'liquid_water_100';
    }
    var pct = Math.round((i / n) * 1000);
    return 'liquid_water_l' + n + '_' + String(pct).padStart(4, '0');
  }

  function buildSolidBlockerIndex(boxes) {
    var out = {};
    var list = Array.isArray(boxes) ? boxes : [];
    for (var i = 0; i < list.length; i++) {
      var b = list[i] || {};
      if (isLiquidBox(b)) continue;
      if (b.renderHidden === true && b.collisionOnly !== true) continue;
      var isOpen = b.solid === false && b.collidable === false && b.collisionOnly !== true;
      if (isOpen) continue;
      var x0 = Math.floor(toNumber(b.x, 0));
      var y0 = Math.floor(toNumber(b.y, 0));
      var z0 = Math.floor(toNumber(b.z, 0));
      var x1 = Math.ceil(toNumber(b.x, 0) + Math.max(0.001, toNumber(b.w != null ? b.w : 1, 1)));
      var y1 = Math.ceil(toNumber(b.y, 0) + Math.max(0.001, toNumber(b.d != null ? b.d : 1, 1)));
      var z1 = Math.ceil(toNumber(b.z, 0) + Math.max(0.001, toNumber(b.h != null ? b.h : 1, 1)));
      for (var x = x0; x < x1; x++) for (var y = y0; y < y1; y++) for (var z = z0; z < z1; z++) out[cellKey(x, y, z)] = true;
    }
    return out;
  }

  function isBlockedCell(blockers, x, y, z, minZ) {
    if (Math.round(toNumber(z, 0)) < Math.round(toNumber(minZ, 0))) return true;
    return !!(blockers && blockers[cellKey(x, y, z)]);
  }

  function canMoveDiagonalWithoutCornerCut(blockers, source, dir, z, minZ) {
    if (!dir.diagonal) return true;
    var sideA = isBlockedCell(blockers, source.x + dir.dx, source.y, z, minZ);
    var sideB = isBlockedCell(blockers, source.x, source.y + dir.dy, z, minZ);
    // No corner cutting: diagonal flow through a blocked corner is forbidden.
    return !sideA && !sideB;
  }

  function buildWaterEntries(instances, boxes) {
    var boxesByInstance = buildBoxesByInstance(boxes);
    var out = {};
    var list = Array.isArray(instances) ? instances : [];
    for (var i = 0; i < list.length; i++) {
      var inst = list[i] || {};
      if (!isLiquidInstance(inst)) continue;
      var x = Math.round(toNumber(inst.x, 0));
      var y = Math.round(toNumber(inst.y, 0));
      var z = Math.round(toNumber(inst.z, 0));
      var key = cellKey(x, y, z);
      var amount = getAmountFromInstance(inst, boxesByInstance);
      if (!out[key]) out[key] = { key: key, x: x, y: y, z: z, amount: 0, instance: inst, instances: [] };
      out[key].amount = clamp(out[key].amount + amount, 0, 1);
      out[key].instances.push(inst);
      if (!out[key].instance) out[key].instance = inst;
    }
    return out;
  }

  function makeRuntimeWaterInstance(entry, amount, params, allocateInstanceId) {
    var renderLevel = quantizeRenderLevel(amount, params.layerCount);
    var id = entry && entry.instance && entry.instance.instanceId ? entry.instance.instanceId : (typeof allocateInstanceId === 'function' ? allocateInstanceId() : ('fluid_' + Math.random().toString(36).slice(2, 10)));
    var prefabId = liquidWaterLayerPrefabIdForAmount(amount, params.layerCount);
    var base = entry && entry.instance ? Object.assign({}, entry.instance) : {};
    return Object.assign(base, {
      instanceId: id,
      prefabId: prefabId,
      name: 'Water Runtime · ' + Math.round(amount * 100) + '%',
      x: entry.x,
      y: entry.y,
      z: entry.z,
      rotation: 0,
      kind: 'liquid_water',
      liquidType: 'water',
      fluidType: 'water',
      fluidRuntime: true,
      waterAmount: clamp(amount, 0, 1),
      fluidAmount: clamp(amount, 0, 1),
      liquidDepth: renderLevel,
      renderWaterLevel: renderLevel,
      fluidRenderLayerCount: params.layerCount
    });
  }

  function ensureWaterEntry(water, x, y, z) {
    var key = cellKey(x, y, z);
    if (!water[key]) water[key] = { key: key, x: Math.round(x), y: Math.round(y), z: Math.round(z), amount: 0, instance: null, instances: [] };
    return water[key];
  }

  function initializeWorkingAmounts(water) {
    var amounts = {};
    var keys = Object.keys(water);
    for (var i = 0; i < keys.length; i++) amounts[keys[i]] = clamp(water[keys[i]].amount, 0, 1);
    return amounts;
  }

  function scaleAndApplyCandidates(candidates, water, amounts, params) {
    var stats = { candidates: candidates.length, applied: 0, totalFlow: 0, movedKeys: {} };
    var outBySource = {};
    var inByTarget = {};
    var i;
    for (i = 0; i < candidates.length; i++) {
      outBySource[candidates[i].from] = (outBySource[candidates[i].from] || 0) + candidates[i].flow;
      inByTarget[candidates[i].to] = (inByTarget[candidates[i].to] || 0) + candidates[i].flow;
    }
    for (i = 0; i < candidates.length; i++) {
      var capSource = clamp(amounts[candidates[i].from] || 0, 0, params.capacity);
      var sumOut = outBySource[candidates[i].from] || 0;
      if (sumOut > capSource && sumOut > EPS) candidates[i].flow *= capSource / sumOut;
    }
    for (i = 0; i < candidates.length; i++) {
      var targetBefore = clamp(amounts[candidates[i].to] || 0, 0, params.capacity);
      var capTarget = Math.max(0, params.capacity - targetBefore);
      var sumIn = inByTarget[candidates[i].to] || 0;
      if (sumIn > capTarget && sumIn > EPS) candidates[i].flow *= capTarget / sumIn;
    }
    for (i = 0; i < candidates.length; i++) {
      var f = candidates[i].flow;
      if (f <= EPS) continue;
      amounts[candidates[i].from] = clamp((amounts[candidates[i].from] || 0) - f, 0, params.capacity);
      amounts[candidates[i].to] = clamp((amounts[candidates[i].to] || 0) + f, 0, params.capacity);
      if (!water[candidates[i].to]) water[candidates[i].to] = candidates[i].target;
      stats.applied += 1;
      stats.totalFlow += f;
      stats.movedKeys[candidates[i].from] = true;
      stats.movedKeys[candidates[i].to] = true;
    }
    stats.totalFlow = Number(stats.totalFlow.toFixed(6));
    return stats;
  }

  function buildGravityCandidates(water, amounts, blockers, params) {
    if (!params.gravityEnabled || params.gravityMaxFlowPerTick <= EPS) return [];
    var keys = Object.keys(water);
    var out = [];
    for (var i = 0; i < keys.length; i++) {
      var source = water[keys[i]];
      var sourceAmount = clamp(amounts[source.key] || 0, 0, params.capacity);
      if (sourceAmount <= params.deleteBelow) continue;
      var targetZ = source.z - 1;
      if (targetZ < params.minZ) continue;
      // Downward flow is allowed only into an empty lower cell.
      if (isBlockedCell(blockers, source.x, source.y, targetZ, params.minZ)) continue;
      var target = ensureWaterEntry(water, source.x, source.y, targetZ);
      var targetAmount = clamp(amounts[target.key] || 0, 0, params.capacity);
      var flow = Math.min(params.gravityMaxFlowPerTick, sourceAmount, Math.max(0, params.capacity - targetAmount));
      if (flow > EPS) out.push({ from: source.key, to: target.key, flow: flow, target: target, kind: 'gravity' });
    }
    return out;
  }

  function buildHorizontalCandidates(water, amounts, blockers, params, lockedKeys) {
    lockedKeys = lockedKeys || {};
    var keys = Object.keys(water);
    var out = [];
    for (var wi = 0; wi < keys.length; wi++) {
      var source = water[keys[wi]];
      if (lockedKeys[source.key]) continue;
      var sourceAmount = clamp(amounts[source.key] || 0, 0, params.capacity);
      if (sourceAmount <= params.deleteBelow) continue;
      for (var di = 0; di < DIRS_8.length; di++) {
        var dir = DIRS_8[di];
        if (dir.diagonal && !params.diagonalEnabled) continue;
        var tx = source.x + dir.dx;
        var ty = source.y + dir.dy;
        var tz = source.z;
        // Horizontal flow is allowed only into an empty same-level cell.
        if (isBlockedCell(blockers, tx, ty, tz, params.minZ)) continue;
        if (!canMoveDiagonalWithoutCornerCut(blockers, source, dir, tz, params.minZ)) continue;
        var toKey = cellKey(tx, ty, tz);
        var target = water[toKey] || { key: toKey, x: tx, y: ty, z: tz, amount: 0, instance: null, instances: [] };
        var targetAmount = clamp(amounts[toKey] || 0, 0, params.capacity);
        var diff = sourceAmount - targetAmount;
        if (diff <= params.minDiff) continue;
        var directionWeight = dir.diagonal ? params.diagonalWeight : 1;
        var flow = Math.min(params.maxFlowPerTick, diff * params.flowRate * directionWeight);
        if (flow <= EPS) continue;
        out.push({ from: source.key, to: toKey, flow: flow, target: target, kind: 'horizontal' });
      }
    }
    return out;
  }

  function simulateStep(scene, params, helpers) {
    var p = normalizeParams(params);
    scene = scene && typeof scene === 'object' ? scene : {};
    helpers = helpers && typeof helpers === 'object' ? helpers : {};
    var instances = Array.isArray(scene.instances) ? scene.instances : [];
    var boxes = Array.isArray(scene.boxes) ? scene.boxes : [];
    var water = buildWaterEntries(instances, boxes);
    var blockers = buildSolidBlockerIndex(boxes);
    var originalWaterKeys = Object.keys(water);
    var amounts = initializeWorkingAmounts(water);
    var totalBefore = 0;
    for (var bi = 0; bi < originalWaterKeys.length; bi++) totalBefore += amounts[originalWaterKeys[bi]] || 0;

    var gravityCandidates = buildGravityCandidates(water, amounts, blockers, p);
    var gravityStats = scaleAndApplyCandidates(gravityCandidates, water, amounts, p);

    var horizontalCandidates = buildHorizontalCandidates(water, amounts, blockers, p, gravityStats.movedKeys || {});
    var horizontalStats = scaleAndApplyCandidates(horizontalCandidates, water, amounts, p);

    var nonWater = instances.filter(function (inst) { return !isLiquidInstance(inst); });
    var nextWaterInstances = [];
    var keys = Object.keys(water).sort();
    var changed = 0, created = 0, removed = 0, totalAfter = 0;

    function alloc() {
      if (typeof helpers.allocateInstanceId === 'function') return helpers.allocateInstanceId();
      return 'fluid_' + String(Math.random()).slice(2);
    }

    for (var wi = 0; wi < keys.length; wi++) {
      var entry = water[keys[wi]];
      var before = clamp(entry.amount, 0, p.capacity);
      var after = clamp(amounts[entry.key] || 0, 0, p.capacity);
      if (after <= p.deleteBelow) {
        if (entry.instance) removed += 1;
        continue;
      }
      if (Math.abs(after - before) > 1e-6) changed += 1;
      if (!entry.instance) created += 1;
      totalAfter += after;
      nextWaterInstances.push(makeRuntimeWaterInstance(entry, after, p, alloc));
    }

    return {
      instances: nonWater.concat(nextWaterInstances),
      stats: {
        ok: true,
        candidates: gravityStats.candidates + horizontalStats.candidates,
        gravityCandidates: gravityStats.candidates,
        horizontalCandidates: horizontalStats.candidates,
        gravityApplied: gravityStats.applied,
        horizontalApplied: horizontalStats.applied,
        changed: changed,
        created: created,
        removed: removed,
        waterCellsBefore: originalWaterKeys.length,
        waterCellsAfter: nextWaterInstances.length,
        totalBefore: Number(totalBefore.toFixed(6)),
        totalAfter: Number(totalAfter.toFixed(6)),
        massError: Number((totalAfter - totalBefore).toFixed(6)),
        layerCount: p.layerCount,
        gravityEnabled: p.gravityEnabled
      }
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeParams: normalizeParams,
    quantizeRenderLevel: quantizeRenderLevel,
    liquidWaterLayerPrefabIdForAmount: liquidWaterLayerPrefabIdForAmount,
    isLiquidInstance: isLiquidInstance,
    isLiquidBox: isLiquidBox,
    buildWaterEntries: buildWaterEntries,
    buildSolidBlockerIndex: buildSolidBlockerIndex,
    canMoveDiagonalWithoutCornerCut: canMoveDiagonalWithoutCornerCut,
    simulateStep: simulateStep
  };

  window.__FLUID_RULES_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') window.__APP_NAMESPACE.bind('domain.fluidRulesCore', api, { owner: OWNER, phase: PHASE });
})();
