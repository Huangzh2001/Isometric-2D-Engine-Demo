(function () {
  if (typeof window === 'undefined') return;
  var OWNER = 'src/core/domain/floor-plan-domain-core.js';
  var PHASE = 'FLOOR-CORE-V36';
  var EDGE_KEYS = ['n', 'e', 's', 'w'];
  var FLOOR_BOUND_MAX = 10000000;
  var LEVEL_MAX = 12;

  function cloneJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return value; }
  }

  function toInt(value, fallback) {
    var num = Number(value);
    if (!isFinite(num)) return Number(fallback) || 0;
    return Math.round(num);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cellKey(x, y) {
    return String(toInt(x, 0)) + ',' + String(toInt(y, 0));
  }

  function levelKey(level) {
    return String(clamp(toInt(level, 0), 0, 999));
  }

  function hslToHex(h, s, l) {
    h = ((Number(h) || 0) % 360 + 360) % 360;
    s = clamp(Number(s) || 0, 0, 100) / 100;
    l = clamp(Number(l) || 0, 0, 100) / 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0, g = 0, b = 0;
    if (hp >= 0 && hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    var m = l - c / 2;
    function part(v) {
      var n = Math.round((v + m) * 255);
      var hex = n.toString(16).toUpperCase();
      return hex.length === 1 ? '0' + hex : hex;
    }
    return '#' + part(r) + part(g) + part(b);
  }

  function computeLevelRampColor(level, totalLevels) {
    level = clamp(toInt(level, 0), 0, 999);
    totalLevels = clamp(toInt(totalLevels, 1), 1, 999);
    var t = totalLevels <= 1 ? 0 : level / Math.max(1, totalLevels - 1);
    var hue = 220 - 210 * t; // blue -> red
    var saturation = 82;
    var lightness = 58 + 4 * Math.cos(t * Math.PI);
    return hslToHex(hue, saturation, lightness);
  }

  function defaultLevelBounds(cols, rows, originX, originY) {
    return {
      originX: toInt(originX, 0),
      originY: toInt(originY, 0),
      cols: clamp(toInt(cols, 10), 1, FLOOR_BOUND_MAX),
      rows: clamp(toInt(rows, 8), 1, FLOOR_BOUND_MAX)
    };
  }

  function isWithinLevelBounds(bounds, x, y) {
    if (!bounds) return false;
    x = toInt(x, 0);
    y = toInt(y, 0);
    return x >= bounds.originX && y >= bounds.originY && x < (bounds.originX + bounds.cols) && y < (bounds.originY + bounds.rows);
  }

  function defaultCell(x, y) {
    return {
      x: toInt(x, 0),
      y: toInt(y, 0),
      enabled: true,
      placeable: true,
      walls: { n: 0, e: 0, s: 0, w: 0 }
    };
  }

  function defaultLevelMeta(level, totalLevels) {
    level = clamp(toInt(level, 0), 0, LEVEL_MAX - 1);
    return {
      name: 'L' + level,
      color: computeLevelRampColor(level, totalLevels || 1),
      visible: true,
      locked: false,
      offsetX: 0,
      offsetY: 0,
      elevationGap: level === 0 ? 0 : 1
    };
  }

  function touchMeta(plan) {
    plan.meta = plan.meta || {};
    plan.meta.updatedAt = new Date().toISOString();
    return plan;
  }

  function normalizePlanLimits(plan) {
    plan.levelCount = clamp(toInt(plan.levelCount, 1), 1, LEVEL_MAX);
    plan.defaultWallHeight = clamp(toInt(plan.defaultWallHeight, 2), 1, 8);
    plan.maxWallHeight = clamp(toInt(plan.maxWallHeight, 8), 1, 12);
    plan.defaultWallHeight = Math.min(plan.defaultWallHeight, plan.maxWallHeight);
    return plan;
  }

  function readPlanOption(options, key, fallback) {
    if (options && Object.prototype.hasOwnProperty.call(options, key) && options[key] != null) return options[key];
    if (options && options.bounds && Object.prototype.hasOwnProperty.call(options.bounds, key) && options.bounds[key] != null) return options.bounds[key];
    return fallback;
  }

  function ensureEnvelopeBounds(plan) {
    var minX = 0;
    var minY = 0;
    var maxX = 1;
    var maxY = 1;
    var initialized = false;
    Object.keys(plan.levelBounds || {}).forEach(function (rawLevel) {
      var item = plan.levelBounds[rawLevel] || {};
      var originX = toInt(item.originX, 0);
      var originY = toInt(item.originY, 0);
      var cols = clamp(toInt(item.cols, 1), 1, FLOOR_BOUND_MAX);
      var rows = clamp(toInt(item.rows, 1), 1, FLOOR_BOUND_MAX);
      var endX = originX + cols;
      var endY = originY + rows;
      if (!initialized) {
        minX = originX; minY = originY; maxX = endX; maxY = endY; initialized = true;
      } else {
        minX = Math.min(minX, originX);
        minY = Math.min(minY, originY);
        maxX = Math.max(maxX, endX);
        maxY = Math.max(maxY, endY);
      }
    });
    plan.bounds = plan.bounds || {};
    plan.bounds.originX = minX;
    plan.bounds.originY = minY;
    plan.bounds.cols = Math.max(1, maxX - minX);
    plan.bounds.rows = Math.max(1, maxY - minY);
    return plan.bounds;
  }

  function getLevelBounds(plan, level) {
    plan = plan || {};
    var raw = plan.levelBounds && plan.levelBounds[levelKey(level)] ? plan.levelBounds[levelKey(level)] : (plan.bounds || { cols: 10, rows: 8, originX: 0, originY: 0 });
    return defaultLevelBounds(raw.cols, raw.rows, raw.originX, raw.originY);
  }

  function ensureLevelBounds(plan, level, bounds) {
    if (!plan.levelBounds) plan.levelBounds = {};
    plan.levelBounds[levelKey(level)] = defaultLevelBounds(bounds && bounds.cols, bounds && bounds.rows, bounds && bounds.originX, bounds && bounds.originY);
    ensureEnvelopeBounds(plan);
    return plan.levelBounds[levelKey(level)];
  }

  function applyLevelColorRamp(plan) {
    if (!plan.levelMeta) plan.levelMeta = {};
    for (var level = 0; level < plan.levelCount; level++) {
      var key = levelKey(level);
      var meta = plan.levelMeta[key] || defaultLevelMeta(level, plan.levelCount);
      if (meta.name == null || String(meta.name).trim() === '') meta.name = 'L' + level;
      meta.color = computeLevelRampColor(level, plan.levelCount);
      if (level === 0) meta.elevationGap = 0;
      plan.levelMeta[key] = meta;
    }
    return plan;
  }

  function normalizeLevelBoundsMap(rawLevelBounds, plan) {
    var out = {};
    var fallback = defaultLevelBounds(plan.bounds && plan.bounds.cols, plan.bounds && plan.bounds.rows, plan.bounds && plan.bounds.originX, plan.bounds && plan.bounds.originY);
    for (var level = 0; level < plan.levelCount; level++) {
      var source = rawLevelBounds && rawLevelBounds[levelKey(level)] ? rawLevelBounds[levelKey(level)] : fallback;
      out[levelKey(level)] = defaultLevelBounds(source.cols, source.rows, source.originX, source.originY);
    }
    return out;
  }

  function normalizeCell(raw, plan) {
    if (!raw || raw.enabled === false) return null;
    var cell = defaultCell(raw.x, raw.y);
    cell.placeable = raw.placeable !== false;
    if (raw.walls && typeof raw.walls === 'object') {
      EDGE_KEYS.forEach(function (edge) {
        cell.walls[edge] = clamp(toInt(raw.walls[edge], 0), 0, plan.maxWallHeight);
      });
    }
    return cell;
  }

  function normalizeLevelCells(rawCells, plan, level) {
    var out = {};
    var bounds = getLevelBounds(plan, level);
    if (!rawCells || typeof rawCells !== 'object') return out;
    Object.keys(rawCells).forEach(function (key) {
      var cell = normalizeCell(rawCells[key], plan);
      if (!cell) return;
      if (!isWithinLevelBounds(bounds, cell.x, cell.y)) return;
      out[cellKey(cell.x, cell.y)] = cell;
    });
    return out;
  }

  function normalizeLevels(rawLevels, plan) {
    var levels = {};
    for (var level = 0; level < plan.levelCount; level++) levels[levelKey(level)] = {};
    if (!rawLevels || typeof rawLevels !== 'object') return levels;
    Object.keys(rawLevels).forEach(function (rawLevelKey) {
      var level = clamp(toInt(rawLevelKey, -1), 0, plan.levelCount - 1);
      levels[levelKey(level)] = normalizeLevelCells(rawLevels[rawLevelKey], plan, level);
    });
    return levels;
  }

  function normalizeLevelMetaMap(rawMeta, plan) {
    var out = {};
    for (var level = 0; level < plan.levelCount; level++) out[levelKey(level)] = defaultLevelMeta(level, plan.levelCount);
    if (!rawMeta || typeof rawMeta !== 'object') return out;
    Object.keys(rawMeta).forEach(function (rawLevelKey) {
      var level = clamp(toInt(rawLevelKey, -1), 0, plan.levelCount - 1);
      var source = rawMeta[rawLevelKey] || {};
      out[levelKey(level)] = {
        name: source.name != null ? String(source.name) : ('L' + level),
        color: computeLevelRampColor(level, plan.levelCount),
        visible: source.visible !== false,
        locked: source.locked === true,
        offsetX: toInt(source.offsetX, 0),
        offsetY: toInt(source.offsetY, 0),
        elevationGap: clamp(toInt(source.elevationGap, level === 0 ? 0 : 1), level === 0 ? 0 : 1, 12)
      };
    });
    out[levelKey(0)].elevationGap = 0;
    out[levelKey(0)].visible = true;
    return out;
  }

  function createBasePlan(options) {
    options = options || {};
    var envelope = defaultLevelBounds(readPlanOption(options, 'cols', 10), readPlanOption(options, 'rows', 8), readPlanOption(options, 'originX', 0), readPlanOption(options, 'originY', 0));
    var plan = {
      schema: String(options.schema || 'iso-room-floorplan/v2.1'),
      meta: {
        name: String((options.meta && options.meta.name) || options.name || 'Untitled Floor Plan'),
        createdAt: (options.meta && options.meta.createdAt) || options.createdAt || new Date().toISOString(),
        updatedAt: (options.meta && options.meta.updatedAt) || options.updatedAt || new Date().toISOString()
      },
      shapeMode: String(options.shapeMode || (options.meta && options.meta.shapeMode) || 'rectangle') === 'custom' ? 'custom' : 'rectangle',
      bounds: envelope,
      levelCount: clamp(toInt(options.levelCount, 1), 1, LEVEL_MAX),
      defaultWallHeight: clamp(toInt(options.defaultWallHeight, 2), 1, 8),
      maxWallHeight: clamp(toInt(options.maxWallHeight, 8), 1, 12),
      levelBounds: {},
      levels: {},
      levelMeta: {}
    };
    normalizePlanLimits(plan);
    plan.levelBounds = normalizeLevelBoundsMap(options.levelBounds || null, plan);
    ensureEnvelopeBounds(plan);
    plan.levels = normalizeLevels(options.levels || {}, plan);
    plan.levelMeta = normalizeLevelMetaMap(options.levelMeta || {}, plan);
    applyLevelColorRamp(plan);
    return plan;
  }

  function normalizePlan(input) {
    var source = input && typeof input === 'object' ? input : {};
    var plan = createBasePlan({
      schema: source.schema,
      name: source.name,
      meta: source.meta,
      shapeMode: source.shapeMode,
      bounds: source.bounds,
      cols: source.cols,
      rows: source.rows,
      originX: source.originX,
      originY: source.originY,
      levelCount: source.levelCount,
      defaultWallHeight: source.defaultWallHeight,
      maxWallHeight: source.maxWallHeight,
      levelBounds: source.levelBounds,
      levels: source.levels,
      levelMeta: source.levelMeta,
      createdAt: source.createdAt,
      updatedAt: source.updatedAt
    });
    if (source.meta) {
      if (source.meta.name != null) plan.meta.name = String(source.meta.name);
      if (source.meta.createdAt != null) plan.meta.createdAt = String(source.meta.createdAt);
      if (source.meta.updatedAt != null) plan.meta.updatedAt = String(source.meta.updatedAt);
    }
    applyLevelColorRamp(plan);
    return plan;
  }

  function clonePlan(plan) {
    return normalizePlan(cloneJson(plan));
  }

  function ensureLevelStore(plan, level) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (!plan.levels) plan.levels = {};
    if (!plan.levels[levelKey(level)]) plan.levels[levelKey(level)] = {};
    if (!plan.levelMeta) plan.levelMeta = {};
    if (!plan.levelMeta[levelKey(level)]) plan.levelMeta[levelKey(level)] = defaultLevelMeta(level, plan.levelCount);
    if (!plan.levelBounds) plan.levelBounds = {};
    if (!plan.levelBounds[levelKey(level)]) plan.levelBounds[levelKey(level)] = defaultLevelBounds(plan.bounds.cols, plan.bounds.rows);
    return plan.levels[levelKey(level)];
  }

  function ensureLevelMeta(plan, level) {
    ensureLevelStore(plan, level);
    return plan.levelMeta[levelKey(level)];
  }

  function fillRectangleLevel(plan, level, options) {
    options = options || {};
    var store = ensureLevelStore(plan, level);
    if (options.clearExisting === true) {
      Object.keys(store).forEach(function (key) { delete store[key]; });
    }
    var bounds = getLevelBounds(plan, level);
    for (var y = bounds.originY; y < bounds.originY + bounds.rows; y++) {
      for (var x = bounds.originX; x < bounds.originX + bounds.cols; x++) {
        store[cellKey(x, y)] = defaultCell(x, y);
      }
    }
    return plan;
  }

  function copyLevelFootprint(plan, sourceLevel, targetLevel, options) {
    options = options || {};
    var targetStore = ensureLevelStore(plan, targetLevel);
    Object.keys(targetStore).forEach(function (key) { delete targetStore[key]; });
    var sourceStore = plan.levels && plan.levels[levelKey(sourceLevel)] ? plan.levels[levelKey(sourceLevel)] : {};
    var targetBounds = getLevelBounds(plan, targetLevel);
    var copied = 0;
    Object.keys(sourceStore).forEach(function (key) {
      var cell = normalizeCell(sourceStore[key], plan);
      if (!cell) return;
      if (!isWithinLevelBounds(targetBounds, cell.x, cell.y)) return;
      targetStore[cellKey(cell.x, cell.y)] = {
        x: cell.x,
        y: cell.y,
        enabled: true,
        placeable: cell.placeable !== false,
        walls: options.copyWalls ? cloneJson(cell.walls || { n: 0, e: 0, s: 0, w: 0 }) : { n: 0, e: 0, s: 0, w: 0 }
      };
      copied += 1;
    });
    return plan;
  }

  function createRectanglePlan(options) {
    options = options || {};
    var requestedLevels = clamp(toInt(options.levelCount, 1), 1, LEVEL_MAX);
    var plan = createBasePlan({
      name: options.name,
      cols: options.cols,
      rows: options.rows,
      defaultWallHeight: options.defaultWallHeight,
      maxWallHeight: options.maxWallHeight,
      levelCount: 1,
      shapeMode: 'rectangle'
    });
    fillRectangleLevel(plan, 0, { clearExisting: true });
    if (requestedLevels > 1) setLevelCount(plan, requestedLevels, { sourceLevel: 0, copyWalls: false, initMode: 'empty' });
    touchMeta(plan);
    return plan;
  }

  function createCustomPlan(options) {
    options = options || {};
    var plan = createBasePlan({
      name: options.name,
      cols: options.cols,
      rows: options.rows,
      defaultWallHeight: options.defaultWallHeight,
      maxWallHeight: options.maxWallHeight,
      levelCount: clamp(toInt(options.levelCount, 1), 1, LEVEL_MAX),
      shapeMode: 'custom'
    });
    touchMeta(plan);
    return plan;
  }

  function getCell(plan, level, x, y) {
    var store = plan && plan.levels ? plan.levels[levelKey(level)] : null;
    return store ? store[cellKey(x, y)] || null : null;
  }

  function getLevelMeta(plan, level) {
    var meta = plan && plan.levelMeta ? plan.levelMeta[levelKey(level)] : null;
    return meta ? cloneJson(meta) : defaultLevelMeta(level, plan && plan.levelCount || 1);
  }

  function getLevelColor(plan, level) {
    return computeLevelRampColor(level, plan && plan.levelCount || 1);
  }

  function getVisibleLevels(plan) {
    plan = normalizePlan(plan || {});
    var out = [];
    for (var level = 0; level < plan.levelCount; level++) {
      if (getLevelMeta(plan, level).visible !== false) out.push(level);
    }
    return out;
  }

  function getAbsoluteLevelTransform(plan, level) {
    level = clamp(toInt(level, 0), 0, Math.max(0, (plan && plan.levelCount || 1) - 1));
    var out = { offsetX: 0, offsetY: 0, elevation: 0 };
    for (var i = 0; i <= level; i++) {
      var meta = getLevelMeta(plan, i);
      out.offsetX += toInt(meta.offsetX, 0);
      out.offsetY += toInt(meta.offsetY, 0);
      out.elevation += i === 0 ? 0 : clamp(toInt(meta.elevationGap, 1), 1, 12);
    }
    return out;
  }

  function growLevelBoundsToInclude(plan, level, x, y) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    x = toInt(x, 0);
    y = toInt(y, 0);
    var bounds = getLevelBounds(plan, level);
    var nextOriginX = bounds.originX;
    var nextOriginY = bounds.originY;
    var nextEndX = bounds.originX + bounds.cols;
    var nextEndY = bounds.originY + bounds.rows;
    if (x < nextOriginX) nextOriginX = x;
    if (y < nextOriginY) nextOriginY = y;
    if (x >= nextEndX) nextEndX = x + 1;
    if (y >= nextEndY) nextEndY = y + 1;
    var nextCols = nextEndX - nextOriginX;
    var nextRows = nextEndY - nextOriginY;
    if (nextOriginX === bounds.originX && nextOriginY === bounds.originY && nextCols === bounds.cols && nextRows === bounds.rows) return false;
    ensureLevelBounds(plan, level, { originX: nextOriginX, originY: nextOriginY, cols: nextCols, rows: nextRows });
    ensureEnvelopeBounds(plan);
    touchMeta(plan);
    return true;
  }

  function ensureBoundsForCell(plan, level, x, y) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    x = toInt(x, 0);
    y = toInt(y, 0);
    growLevelBoundsToInclude(plan, level, x, y);
    return getLevelBounds(plan, level);
  }

  function ensureCell(plan, level, x, y, options) {
    options = options || {};
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    x = toInt(x, 0);
    y = toInt(y, 0);
    if (options.autoGrow === true) ensureBoundsForCell(plan, level, x, y);
    var bounds = getLevelBounds(plan, level);
    if (!isWithinLevelBounds(bounds, x, y)) return null;
    var store = ensureLevelStore(plan, level);
    var key = cellKey(x, y);
    if (!store[key]) {
      store[key] = defaultCell(x, y);
      if (Object.prototype.hasOwnProperty.call(options, 'placeable')) store[key].placeable = !!options.placeable;
    }
    return store[key];
  }

  function addCellAt(plan, level, x, y, options) {
    options = options || {};
    var cell = ensureCell(plan, level, x, y, { placeable: options.placeable, autoGrow: options.autoGrow !== false });
    if (!cell) return plan;
    if (Object.prototype.hasOwnProperty.call(options, 'placeable')) cell.placeable = !!options.placeable;
    touchMeta(plan);
    return plan;
  }

  function removeCellAt(plan, level, x, y) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    var store = ensureLevelStore(plan, level);
    delete store[cellKey(x, y)];
    touchMeta(plan);
    return plan;
  }

  function setCellEnabled(plan, level, x, y, enabled, options) {
    options = options || {};
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    x = toInt(x, 0);
    y = toInt(y, 0);
    if (!enabled) return removeCellAt(plan, level, x, y);
    return addCellAt(plan, level, x, y, { placeable: options.placeable, autoGrow: true });
  }

  function setPlaceable(plan, level, x, y, placeable) {
    var cell = ensureCell(plan, level, x, y, { placeable: placeable, autoGrow: true });
    if (!cell) return plan;
    cell.placeable = !!placeable;
    touchMeta(plan);
    return plan;
  }

  function setWallHeight(plan, level, x, y, edge, wallHeight) {
    edge = String(edge || '').toLowerCase();
    if (EDGE_KEYS.indexOf(edge) < 0) return plan;
    var cell = ensureCell(plan, level, x, y, { autoGrow: false });
    if (!cell) return plan;
    cell.walls[edge] = clamp(toInt(wallHeight, plan.defaultWallHeight), 0, plan.maxWallHeight);
    touchMeta(plan);
    return plan;
  }

  function clearWall(plan, level, x, y, edge) {
    return setWallHeight(plan, level, x, y, edge, 0);
  }

  function forEachRect(x1, y1, x2, y2, iteratee) {
    var minX = Math.min(toInt(x1, 0), toInt(x2, 0));
    var maxX = Math.max(toInt(x1, 0), toInt(x2, 0));
    var minY = Math.min(toInt(y1, 0), toInt(y2, 0));
    var maxY = Math.max(toInt(y1, 0), toInt(y2, 0));
    for (var y = minY; y <= maxY; y++) {
      for (var x = minX; x <= maxX; x++) iteratee(x, y);
    }
  }

  function applyRectEnabled(plan, level, x1, y1, x2, y2, enabled, options) {
    options = options || {};
    forEachRect(x1, y1, x2, y2, function (x, y) { setCellEnabled(plan, level, x, y, enabled, options); });
    touchMeta(plan);
    return plan;
  }

  function floodFillEnabled(plan, level, startX, startY, enabled, options) {
    options = options || {};
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    startX = toInt(startX, 0);
    startY = toInt(startY, 0);
    var bounds = getLevelBounds(plan, level);
    if (!isWithinLevelBounds(bounds, startX, startY)) return plan;
    var startCell = getCell(plan, level, startX, startY);
    var startEnabled = !!startCell;
    var startPlaceable = startCell ? !!startCell.placeable : true;
    var queue = [[startX, startY]];
    var seen = {};
    while (queue.length) {
      var current = queue.shift();
      var x = current[0];
      var y = current[1];
      var key = cellKey(x, y);
      if (seen[key]) continue;
      seen[key] = true;
      var cell = getCell(plan, level, x, y);
      if (!!cell !== startEnabled) continue;
      if (cell && !!cell.placeable !== startPlaceable) continue;
      setCellEnabled(plan, level, x, y, enabled, options);
      [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].forEach(function (next) {
        if (!isWithinLevelBounds(bounds, next[0], next[1])) return;
        if (!seen[cellKey(next[0], next[1])]) queue.push(next);
      });
    }
    touchMeta(plan);
    return plan;
  }

  function renamePlan(plan, name) {
    plan.meta = plan.meta || {};
    plan.meta.name = String(name || 'Untitled Floor Plan');
    touchMeta(plan);
    return plan;
  }

  function setShapeMode(plan, shapeMode) {
    plan.shapeMode = String(shapeMode || 'rectangle') === 'custom' ? 'custom' : 'rectangle';
    touchMeta(plan);
    return plan;
  }

  function setLevelName(plan, level, name) {
    var meta = ensureLevelMeta(plan, level);
    meta.name = String(name || ('L' + clamp(toInt(level, 0), 0, 99)));
    touchMeta(plan);
    return plan;
  }

  function setLevelColor(plan, level, color) {
    var meta = ensureLevelMeta(plan, level);
    meta.color = computeLevelRampColor(level, plan.levelCount);
    touchMeta(plan);
    return plan;
  }

  function setLevelVisibility(plan, level, visible) {
    var meta = ensureLevelMeta(plan, level);
    meta.visible = visible !== false;
    touchMeta(plan);
    return plan;
  }

  function setLevelLocked(plan, level, locked) {
    var meta = ensureLevelMeta(plan, level);
    meta.locked = locked === true;
    touchMeta(plan);
    return plan;
  }

  function pruneOutOfBounds(plan, level) {
    var levelsToCheck = typeof level === 'number' ? [clamp(toInt(level, 0), 0, plan.levelCount - 1)] : null;
    Object.keys(plan.levels || {}).forEach(function (rawLevel) {
      var numericLevel = clamp(toInt(rawLevel, 0), 0, plan.levelCount - 1);
      if (levelsToCheck && levelsToCheck.indexOf(numericLevel) < 0) return;
      var bounds = getLevelBounds(plan, numericLevel);
      var store = plan.levels[rawLevel] || {};
      Object.keys(store).forEach(function (key) {
        var cell = store[key];
        if (!cell || !isWithinLevelBounds(bounds, cell.x, cell.y)) delete store[key];
      });
    });
  }

  function resizeBounds(plan, cols, rows, options) {
    options = options || {};
    var level = clamp(toInt(options.level, 0), 0, plan.levelCount - 1);
    var before = getLevelBounds(plan, level);
    var next = defaultLevelBounds(cols != null ? cols : before.cols, rows != null ? rows : before.rows);
    ensureLevelBounds(plan, level, next);
    pruneOutOfBounds(plan, level);
    if (plan.shapeMode === 'rectangle' && options.rebuildRectangle) {
      fillRectangleLevel(plan, level, { clearExisting: false });
    }
    ensureEnvelopeBounds(plan);
    if (before.cols !== next.cols || before.rows !== next.rows) touchMeta(plan);
    return plan;
  }

  function setDefaultWallHeight(plan, wallHeight) {
    plan.defaultWallHeight = clamp(toInt(wallHeight, plan.defaultWallHeight), 1, plan.maxWallHeight);
    touchMeta(plan);
    return plan;
  }

  function createEmptyLevel(plan, targetLevel, sourceLevel, options) {
    options = options || {};
    targetLevel = clamp(toInt(targetLevel, 0), 0, Math.max(0, plan.levelCount - 1));
    sourceLevel = clamp(toInt(sourceLevel, Math.max(0, targetLevel - 1)), 0, Math.max(0, plan.levelCount - 1));
    var sourceBounds = getLevelBounds(plan, sourceLevel);
    var initBounds = options.bounds || sourceBounds;
    plan.levels[levelKey(targetLevel)] = {};
    ensureLevelBounds(plan, targetLevel, initBounds);
    plan.levelMeta[levelKey(targetLevel)] = {
      name: options.name != null ? String(options.name) : ('L' + targetLevel),
      color: computeLevelRampColor(targetLevel, plan.levelCount),
      visible: options.visible !== false,
      locked: options.locked === true,
      offsetX: toInt(options.offsetX, 0),
      offsetY: toInt(options.offsetY, 0),
      elevationGap: targetLevel === 0 ? 0 : Math.max(1, toInt(options.elevationGap, 1))
    };
    touchMeta(plan);
    return plan;
  }

  function createRectInitializedLevel(plan, targetLevel, sourceLevel, options) {
    options = options || {};
    createEmptyLevel(plan, targetLevel, sourceLevel, options);
    fillRectangleLevel(plan, targetLevel, { clearExisting: true });
    touchMeta(plan);
    return plan;
  }

  function cloneLevelCells(plan, sourceLevel, targetLevel, options) {
    options = options || {};
    sourceLevel = clamp(toInt(sourceLevel, 0), 0, Math.max(0, plan.levelCount - 1));
    targetLevel = clamp(toInt(targetLevel, 0), 0, Math.max(0, plan.levelCount - 1));
    plan.levels[levelKey(targetLevel)] = {};
    ensureLevelBounds(plan, targetLevel, getLevelBounds(plan, sourceLevel));
    copyLevelFootprint(plan, sourceLevel, targetLevel, { copyWalls: !!options.copyWalls });
    touchMeta(plan);
    return plan;
  }

  function initializeNewLevel(plan, targetLevel, sourceLevel, options) {
    options = options || {};
    var initMode = String(options.initMode || 'empty');
    if (initMode === 'rect') return createRectInitializedLevel(plan, targetLevel, sourceLevel, options);
    if (initMode === 'duplicate') {
      createEmptyLevel(plan, targetLevel, sourceLevel, options);
      cloneLevelCells(plan, sourceLevel, targetLevel, { copyWalls: !!options.copyWalls });
      return plan;
    }
    return createEmptyLevel(plan, targetLevel, sourceLevel, options);
  }

  function setLevelCount(plan, levelCount, options) {
    options = options || {};
    var oldCount = plan.levelCount;
    var nextCount = clamp(toInt(levelCount, oldCount), 1, LEVEL_MAX);
    plan.levelCount = nextCount;
    normalizePlanLimits(plan);
    if (!plan.levels) plan.levels = {};
    if (!plan.levelMeta) plan.levelMeta = {};
    if (!plan.levelBounds) plan.levelBounds = {};

    if (nextCount > oldCount) {
      for (var level = oldCount; level < nextCount; level++) {
        if (!plan.levels[levelKey(level)]) plan.levels[levelKey(level)] = {};
        initializeNewLevel(plan, level, options.sourceLevel != null ? options.sourceLevel : Math.max(0, level - 1), {
          copyWalls: !!options.copyWalls,
          elevationGap: level === 0 ? 0 : 1,
          initMode: options.initMode || 'empty'
        });
      }
    }

    for (var existing = 0; existing < nextCount; existing++) {
      if (!plan.levels[levelKey(existing)]) plan.levels[levelKey(existing)] = {};
      if (!plan.levelBounds[levelKey(existing)]) plan.levelBounds[levelKey(existing)] = defaultLevelBounds(plan.bounds.cols, plan.bounds.rows);
      if (!plan.levelMeta[levelKey(existing)]) plan.levelMeta[levelKey(existing)] = defaultLevelMeta(existing, plan.levelCount);
      if (existing === 0) plan.levelMeta[levelKey(existing)].elevationGap = 0;
      if (existing > 0 && plan.levelMeta[levelKey(existing)].elevationGap < 1) plan.levelMeta[levelKey(existing)].elevationGap = 1;
    }

    Object.keys(plan.levels).forEach(function (rawLevel) { if (toInt(rawLevel, -1) >= nextCount) delete plan.levels[rawLevel]; });
    Object.keys(plan.levelMeta).forEach(function (rawLevel) { if (toInt(rawLevel, -1) >= nextCount) delete plan.levelMeta[rawLevel]; });
    Object.keys(plan.levelBounds).forEach(function (rawLevel) { if (toInt(rawLevel, -1) >= nextCount) delete plan.levelBounds[rawLevel]; });

    ensureEnvelopeBounds(plan);
    applyLevelColorRamp(plan);
    touchMeta(plan);
    return plan;
  }

  function addLevel(plan, sourceLevel, options) {
    options = options || {};
    return setLevelCount(plan, (plan.levelCount || 1) + 1, {
      sourceLevel: sourceLevel,
      copyWalls: !!options.copyWalls,
      initMode: options.initMode || 'empty'
    });
  }

  function addRectInitializedLevel(plan, sourceLevel, options) {
    options = options || {};
    return setLevelCount(plan, (plan.levelCount || 1) + 1, {
      sourceLevel: sourceLevel,
      copyWalls: !!options.copyWalls,
      initMode: 'rect'
    });
  }

  function duplicateLevel(plan, sourceLevel, options) {
    options = options || {};
    var targetLevel = plan.levelCount || 1;
    setLevelCount(plan, targetLevel + 1, { sourceLevel: sourceLevel, copyWalls: !!options.copyWalls, initMode: 'empty' });
    cloneLevelCells(plan, sourceLevel, targetLevel, { copyWalls: !!options.copyWalls });
    var sourceMeta = getLevelMeta(plan, sourceLevel);
    plan.levelMeta[levelKey(targetLevel)] = {
      name: String(sourceMeta.name || ('L' + sourceLevel)) + ' Copy',
      color: computeLevelRampColor(targetLevel, plan.levelCount),
      visible: true,
      locked: false,
      offsetX: 0,
      offsetY: 0,
      elevationGap: targetLevel === 0 ? 0 : Math.max(1, toInt(sourceMeta.elevationGap, 1))
    };
    applyLevelColorRamp(plan);
    touchMeta(plan);
    return plan;
  }

  function setLevelOffset(plan, level, offsetX, offsetY) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (level === 0) return plan;
    var meta = ensureLevelMeta(plan, level);
    meta.offsetX = clamp(toInt(offsetX, meta.offsetX), -1024, 1024);
    meta.offsetY = clamp(toInt(offsetY, meta.offsetY), -1024, 1024);
    touchMeta(plan);
    return plan;
  }

  function nudgeLevelOffset(plan, level, dx, dy) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (level === 0) return plan;
    var meta = ensureLevelMeta(plan, level);
    return setLevelOffset(plan, level, meta.offsetX + toInt(dx, 0), meta.offsetY + toInt(dy, 0));
  }

  function setLevelElevationGap(plan, level, gap) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (level === 0) return plan;
    var meta = ensureLevelMeta(plan, level);
    meta.elevationGap = clamp(toInt(gap, meta.elevationGap), 1, 12);
    touchMeta(plan);
    return plan;
  }

  function nudgeLevelElevationGap(plan, level, delta) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (level === 0) return plan;
    var meta = ensureLevelMeta(plan, level);
    return setLevelElevationGap(plan, level, meta.elevationGap + toInt(delta, 0));
  }

  function resetLevelTransform(plan, level) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    if (level === 0) return plan;
    var meta = ensureLevelMeta(plan, level);
    meta.offsetX = 0;
    meta.offsetY = 0;
    meta.elevationGap = Math.max(1, toInt(meta.elevationGap, 1));
    touchMeta(plan);
    return plan;
  }

  function applyPerimeterWalls(plan, level, edges, wallHeight) {
    level = clamp(toInt(level, 0), 0, plan.levelCount - 1);
    var store = ensureLevelStore(plan, level);
    var height = clamp(toInt(wallHeight, plan.defaultWallHeight), 1, plan.maxWallHeight);
    edges = edges || { n: true, e: true, s: true, w: true };
    Object.keys(store).forEach(function (key) {
      var cell = store[key];
      if (!cell) return;
      var north = !getCell(plan, level, cell.x, cell.y - 1);
      var south = !getCell(plan, level, cell.x, cell.y + 1);
      var west = !getCell(plan, level, cell.x - 1, cell.y);
      var east = !getCell(plan, level, cell.x + 1, cell.y);
      if (edges.n && north) cell.walls.n = height;
      if (edges.s && south) cell.walls.s = height;
      if (edges.w && west) cell.walls.w = height;
      if (edges.e && east) cell.walls.e = height;
    });
    touchMeta(plan);
    return plan;
  }

  function clearWallsForLevel(plan, level) {
    var store = ensureLevelStore(plan, level);
    Object.keys(store).forEach(function (key) {
      var cell = store[key];
      if (!cell || !cell.walls) return;
      EDGE_KEYS.forEach(function (edge) { cell.walls[edge] = 0; });
    });
    touchMeta(plan);
    return plan;
  }

  function levelCells(plan, level) {
    var store = plan && plan.levels ? plan.levels[levelKey(level)] : null;
    return store || {};
  }

  function levelSummary(plan, level) {
    var enabled = 0;
    var blocked = 0;
    var wallSegments = 0;
    var store = levelCells(plan, level);
    Object.keys(store).forEach(function (key) {
      var cell = store[key];
      if (!cell) return;
      enabled += 1;
      if (cell.placeable === false) blocked += 1;
      EDGE_KEYS.forEach(function (edge) { if (cell.walls && Number(cell.walls[edge]) > 0) wallSegments += 1; });
    });
    return { enabled: enabled, blocked: blocked, wallSegments: wallSegments };
  }

  function absoluteCellMap(plan, level) {
    var store = levelCells(plan, level);
    var transform = getAbsoluteLevelTransform(plan, level);
    var out = {};
    Object.keys(store).forEach(function (key) {
      var cell = store[key];
      if (!cell) return;
      out[cellKey(cell.x + transform.offsetX, cell.y + transform.offsetY)] = true;
    });
    return out;
  }

  function overlapSummary(plan, levelA, levelB) {
    if (levelA < 0 || levelB < 0 || levelA >= plan.levelCount || levelB >= plan.levelCount) return 0;
    var a = absoluteCellMap(plan, levelA);
    var b = absoluteCellMap(plan, levelB);
    var count = 0;
    Object.keys(a).forEach(function (key) { if (b[key]) count += 1; });
    return count;
  }

  function getOverlapPreviewData(plan, activeLevel, selectedLevels) {
    plan = normalizePlan(plan || {});
    activeLevel = clamp(toInt(activeLevel, 0), 0, plan.levelCount - 1);
    var visible = getVisibleLevels(plan);
    var selected = Array.isArray(selectedLevels) ? selectedLevels.map(function (level) { return clamp(toInt(level, 0), 0, plan.levelCount - 1); }) : [];
    var seen = {};
    var levels = [];
    selected.forEach(function (level) {
      var key = String(level);
      if (seen[key]) return;
      seen[key] = true;
      if (visible.indexOf(level) >= 0) levels.push(level);
    });
    if (!levels.length) levels = visible.slice();
    levels.sort(function (a, b) { return a - b; });

    var stats = { activeLevel: activeLevel, levels: [], rendered: false, emptyReason: '', overlapCells: 0, totalCells: 0, entries: [], minX: 0, maxX: 0, minY: 0, maxY: 0 };
    if (!levels.length) { stats.emptyReason = 'no-visible-level'; return stats; }

    var byCoord = {};
    var xs = [];
    var ys = [];
    levels.forEach(function (level) {
      var levelMap = absoluteCellMap(plan, level);
      var cellCount = Object.keys(levelMap).length;
      stats.levels.push({
        level: level,
        name: getLevelMeta(plan, level).name,
        color: getLevelColor(plan, level),
        visible: getLevelMeta(plan, level).visible !== false,
        locked: getLevelMeta(plan, level).locked === true,
        cells: cellCount
      });
      Object.keys(levelMap).forEach(function (coord) {
        var parts = coord.split(',');
        var x = toInt(parts[0], 0);
        var y = toInt(parts[1], 0);
        xs.push(x);
        ys.push(y);
        if (!byCoord[coord]) byCoord[coord] = { x: x, y: y, levels: [] };
        byCoord[coord].levels.push(level);
        stats.totalCells += 1;
      });
    });

    var coords = Object.keys(byCoord);
    if (!coords.length) { stats.emptyReason = 'empty-layer'; return stats; }
    coords.forEach(function (coord) {
      var entry = byCoord[coord];
      entry.levels.sort(function (a, b) { return a - b; });
      if (entry.levels.length > 1) stats.overlapCells += 1;
      stats.entries.push(entry);
    });
    stats.minX = Math.min.apply(null, xs);
    stats.maxX = Math.max.apply(null, xs);
    stats.minY = Math.min.apply(null, ys);
    stats.maxY = Math.max.apply(null, ys);
    stats.rendered = true;
    return stats;
  }

  function getOverlapPreviewStats(plan, activeLevel) {
    return getOverlapPreviewData(plan, activeLevel, []);
  }

  function summarize(plan, label, activeLevel) {
    plan = normalizePlan(plan || {});
    activeLevel = clamp(toInt(activeLevel, 0), 0, plan.levelCount - 1);
    var totalEnabled = 0;
    var totalBlocked = 0;
    var totalWallSegments = 0;
    for (var level = 0; level < plan.levelCount; level++) {
      var levelItem = levelSummary(plan, level);
      totalEnabled += levelItem.enabled;
      totalBlocked += levelItem.blocked;
      totalWallSegments += levelItem.wallSegments;
    }
    var current = levelSummary(plan, activeLevel);
    var currentMeta = getLevelMeta(plan, activeLevel);
    var currentAbs = getAbsoluteLevelTransform(plan, activeLevel);
    var currentBounds = getLevelBounds(plan, activeLevel);
    return {
      phase: PHASE,
      owner: OWNER,
      label: String(label || ''),
      shapeMode: plan.shapeMode,
      cols: plan.bounds.cols,
      rows: plan.bounds.rows,
      currentLevelCols: currentBounds.cols,
      currentLevelRows: currentBounds.rows,
      currentLevelOriginX: currentBounds.originX,
      currentLevelOriginY: currentBounds.originY,
      levelCount: plan.levelCount,
      defaultWallHeight: plan.defaultWallHeight,
      maxWallHeight: plan.maxWallHeight,
      activeLevel: activeLevel,
      enabledCount: totalEnabled,
      blockedCount: totalBlocked,
      wallSegments: totalWallSegments,
      currentLevelEnabled: current.enabled,
      currentLevelBlocked: current.blocked,
      currentLevelWallSegments: current.wallSegments,
      overlapPrev: overlapSummary(plan, activeLevel - 1, activeLevel),
      overlapNext: overlapSummary(plan, activeLevel, activeLevel + 1),
      currentOffsetX: currentMeta.offsetX,
      currentOffsetY: currentMeta.offsetY,
      currentElevationGap: currentMeta.elevationGap,
      currentColor: currentMeta.color,
      currentName: currentMeta.name,
      currentVisible: currentMeta.visible !== false,
      currentLocked: currentMeta.locked === true,
      currentAbsoluteOffsetX: currentAbs.offsetX,
      currentAbsoluteOffsetY: currentAbs.offsetY,
      currentAbsoluteElevation: currentAbs.elevation
    };
  }

  var api = {
    phase: PHASE,
    owner: OWNER,
    edgeKeys: EDGE_KEYS.slice(),
    clonePlan: clonePlan,
    normalizePlan: normalizePlan,
    createRectanglePlan: createRectanglePlan,
    createCustomPlan: createCustomPlan,
    getCell: getCell,
    getLevelMeta: getLevelMeta,
    getLevelColor: getLevelColor,
    getVisibleLevels: getVisibleLevels,
    getLevelBounds: getLevelBounds,
    isWithinLevelBounds: isWithinLevelBounds,
    getAbsoluteLevelTransform: getAbsoluteLevelTransform,
    computeLevelRampColor: computeLevelRampColor,
    applyLevelColorRamp: applyLevelColorRamp,
    growLevelBoundsToInclude: growLevelBoundsToInclude,
    ensureBoundsForCell: ensureBoundsForCell,
    ensureCell: ensureCell,
    addCellAt: addCellAt,
    removeCellAt: removeCellAt,
    setCellEnabled: setCellEnabled,
    setPlaceable: setPlaceable,
    setWallHeight: setWallHeight,
    clearWall: clearWall,
    applyRectEnabled: applyRectEnabled,
    floodFillEnabled: floodFillEnabled,
    renamePlan: renamePlan,
    setShapeMode: setShapeMode,
    setLevelName: setLevelName,
    setLevelColor: setLevelColor,
    setLevelVisibility: setLevelVisibility,
    setLevelLocked: setLevelLocked,
    resizeBounds: resizeBounds,
    setLevelCount: setLevelCount,
    createEmptyLevel: createEmptyLevel,
    createRectInitializedLevel: createRectInitializedLevel,
    cloneLevelCells: cloneLevelCells,
    addLevel: addLevel,
    addRectInitializedLevel: addRectInitializedLevel,
    duplicateLevel: duplicateLevel,
    setDefaultWallHeight: setDefaultWallHeight,
    setLevelOffset: setLevelOffset,
    nudgeLevelOffset: nudgeLevelOffset,
    setLevelElevationGap: setLevelElevationGap,
    nudgeLevelElevationGap: nudgeLevelElevationGap,
    resetLevelTransform: resetLevelTransform,
    applyPerimeterWalls: applyPerimeterWalls,
    clearWallsForLevel: clearWallsForLevel,
    levelSummary: levelSummary,
    overlapSummary: overlapSummary,
    getOverlapPreviewStats: getOverlapPreviewStats,
    getOverlapPreviewData: getOverlapPreviewData,
    summarize: summarize
  };

  window.__FLOOR_EDITOR_DOMAIN__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.floorEditorCore', api, { owner: OWNER, phase: PHASE });
  }
})();
