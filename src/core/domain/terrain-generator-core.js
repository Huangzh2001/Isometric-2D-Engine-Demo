(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-generator-core.js';
  var PHASE = 'TERRAIN-GENERATOR-V1';

  function toNumber(value, fallback) {
    var num = Number(value);
    return Number.isFinite(num) ? num : Number(fallback || 0);
  }

  function clamp(value, min, max) {
    var v = toNumber(value, 0);
    var lo = toNumber(min, 0);
    var hi = toNumber(max, 0);
    if (v < lo) return lo;
    if (v > hi) return hi;
    return v;
  }

  function clamp01(value) {
    return clamp(value, 0, 1);
  }

  function fract(value) {
    var v = Number(value) || 0;
    return v - Math.floor(v);
  }

  function normalizeSeed(seed) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return Math.floor(seed);
    var text = String(seed == null ? '' : seed);
    var hash = 2166136261 >>> 0;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    return hash >>> 0;
  }

  function smoothstep(t) {
    var v = clamp01(t);
    return v * v * (3 - 2 * v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash2D(seed, x, y) {
    var s = normalizeSeed(seed);
    var xi = Math.floor(toNumber(x, 0));
    var yi = Math.floor(toNumber(y, 0));
    var n = Math.sin((xi * 127.1) + (yi * 311.7) + (s * 0.0001) + (s * 74.7)) * 43758.5453123;
    return fract(n);
  }

  function noise2D(seed, x, y) {
    var nx = toNumber(x, 0);
    var ny = toNumber(y, 0);
    var x0 = Math.floor(nx);
    var y0 = Math.floor(ny);
    var x1 = x0 + 1;
    var y1 = y0 + 1;
    var tx = nx - x0;
    var ty = ny - y0;
    var sx = smoothstep(tx);
    var sy = smoothstep(ty);
    var v00 = hash2D(seed, x0, y0);
    var v10 = hash2D(seed, x1, y0);
    var v01 = hash2D(seed, x0, y1);
    var v11 = hash2D(seed, x1, y1);
    var ix0 = lerp(v00, v10, sx);
    var ix1 = lerp(v01, v11, sx);
    return clamp01(lerp(ix0, ix1, sy));
  }

  function normalizeOctaves(value, fallback) {
    var n = Math.round(toNumber(value, fallback || 1));
    if (!Number.isFinite(n) || n < 1) return Math.max(1, Math.round(toNumber(fallback, 1)) || 1);
    return Math.min(12, n);
  }

  function fbm2D(seed, x, y, octaves, persistence, lacunarity, scale) {
    var safeOctaves = normalizeOctaves(octaves, 4);
    var safePersistence = clamp(toNumber(persistence, 0.5), 0, 1.5);
    var safeLacunarity = Math.max(1, toNumber(lacunarity, 2));
    var safeScale = Math.max(0.0001, toNumber(scale, 16));
    var amplitude = 1;
    var frequency = 1;
    var total = 0;
    var amplitudeSum = 0;
    var baseSeed = normalizeSeed(seed);
    for (var i = 0; i < safeOctaves; i++) {
      var sampleSeed = (baseSeed + (i * 1013904223)) >>> 0;
      var sampleX = (toNumber(x, 0) / safeScale) * frequency;
      var sampleY = (toNumber(y, 0) / safeScale) * frequency;
      total += amplitude * noise2D(sampleSeed, sampleX, sampleY);
      amplitudeSum += amplitude;
      amplitude *= safePersistence;
      frequency *= safeLacunarity;
    }
    if (amplitudeSum <= 0) return 0;
    return clamp01(total / amplitudeSum);
  }

  var DEFAULT_HEIGHT_PROFILE = [
    { start: 0.00, end: 0.28, baseHeight: 0 },
    { start: 0.28, end: 0.56, baseHeight: 3 },
    { start: 0.56, end: 0.80, baseHeight: 7 },
    { start: 0.80, end: 1.01, baseHeight: 12 }
  ];

  function cloneProfile(profile) {
    return (Array.isArray(profile) ? profile : DEFAULT_HEIGHT_PROFILE).map(function (segment) {
      var src = segment && typeof segment === 'object' ? segment : {};
      return {
        start: clamp01(toNumber(src.start, 0)),
        end: clamp01(toNumber(src.end, 1)),
        baseHeight: Math.round(toNumber(src.baseHeight, 0))
      };
    });
  }

  function normalizeHeightProfileConfig(profileConfig) {
    var segments = cloneProfile(profileConfig).filter(function (segment) {
      return Number.isFinite(segment.start) && Number.isFinite(segment.end);
    }).sort(function (a, b) {
      return a.start - b.start || a.end - b.end;
    });
    if (!segments.length) return cloneProfile(DEFAULT_HEIGHT_PROFILE);
    for (var i = 0; i < segments.length; i++) {
      if (segments[i].end < segments[i].start) {
        var tmp = segments[i].start;
        segments[i].start = segments[i].end;
        segments[i].end = tmp;
      }
    }
    if (segments[segments.length - 1].end < 1) segments[segments.length - 1].end = 1.01;
    return segments;
  }

  function evaluateHeightProfile(macroNoise, profileConfig) {
    var value = clamp01(macroNoise);
    var segments = normalizeHeightProfileConfig(profileConfig);
    for (var i = 0; i < segments.length; i++) {
      var segment = segments[i];
      var isLast = i === segments.length - 1;
      if (value >= segment.start && (value < segment.end || (isLast && value <= segment.end))) {
        return Math.round(toNumber(segment.baseHeight, 0));
      }
    }
    return Math.round(toNumber(segments[segments.length - 1].baseHeight, 0));
  }

  var DEFAULT_SETTINGS = {
    seed: 1337,
    width: 11,
    height: 9,
    detailScale: 8,
    detailOctaves: 4,
    detailPersistence: 0.5,
    detailLacunarity: 2,
    detailStrength: 4,
    macroScale: 28,
    macroOctaves: 3,
    macroPersistence: 0.55,
    macroLacunarity: 2,
    minHeight: 0,
    maxHeight: 18,
    waterLevel: 0,
    baseHeightOffset: 0,
    heightProfileConfig: DEFAULT_HEIGHT_PROFILE,
    terrainDebugFaceColorsEnabled: false,
    terrainColorMode: 'natural'
  };

  function normalizeTerrainParams(params) {
    var src = params && typeof params === 'object' ? params : {};
    var minHeight = Math.round(toNumber(src.minHeight, DEFAULT_SETTINGS.minHeight));
    var maxHeight = Math.round(toNumber(src.maxHeight, DEFAULT_SETTINGS.maxHeight));
    if (maxHeight < minHeight) {
      var tmp = minHeight;
      minHeight = maxHeight;
      maxHeight = tmp;
    }
    return {
      seed: src.seed != null ? src.seed : DEFAULT_SETTINGS.seed,
      width: Math.max(1, Math.round(toNumber(src.width, DEFAULT_SETTINGS.width))),
      height: Math.max(1, Math.round(toNumber(src.height, DEFAULT_SETTINGS.height))),
      detailScale: Math.max(0.0001, toNumber(src.detailScale, DEFAULT_SETTINGS.detailScale)),
      detailOctaves: normalizeOctaves(src.detailOctaves, DEFAULT_SETTINGS.detailOctaves),
      detailPersistence: clamp(toNumber(src.detailPersistence, DEFAULT_SETTINGS.detailPersistence), 0, 1.5),
      detailLacunarity: Math.max(1, toNumber(src.detailLacunarity, DEFAULT_SETTINGS.detailLacunarity)),
      detailStrength: toNumber(src.detailStrength, DEFAULT_SETTINGS.detailStrength),
      macroScale: Math.max(0.0001, toNumber(src.macroScale, DEFAULT_SETTINGS.macroScale)),
      macroOctaves: normalizeOctaves(src.macroOctaves, DEFAULT_SETTINGS.macroOctaves),
      macroPersistence: clamp(toNumber(src.macroPersistence, DEFAULT_SETTINGS.macroPersistence), 0, 1.5),
      macroLacunarity: Math.max(1, toNumber(src.macroLacunarity, DEFAULT_SETTINGS.macroLacunarity)),
      minHeight: minHeight,
      maxHeight: maxHeight,
      waterLevel: Math.round(toNumber(src.waterLevel, DEFAULT_SETTINGS.waterLevel)),
      baseHeightOffset: Math.round(toNumber(src.baseHeightOffset, DEFAULT_SETTINGS.baseHeightOffset)),
      heightProfileConfig: normalizeHeightProfileConfig(src.heightProfileConfig),
      terrainDebugFaceColorsEnabled: src.terrainDebugFaceColorsEnabled === true,
      terrainColorMode: String(src.terrainColorMode || (src.terrainDebugFaceColorsEnabled ? 'debug-semantic' : 'natural'))
    };
  }

  function generateHeightMap(params) {
    var p = normalizeTerrainParams(params);
    var seed = normalizeSeed(p.seed);
    var detailSeed = (seed + 17) >>> 0;
    var macroSeed = (seed + 1000003) >>> 0;
    var heightMap = [];
    var minObserved = Infinity;
    var maxObserved = -Infinity;
    var total = 0;
    var count = 0;
    for (var x = 0; x < p.width; x++) {
      var column = [];
      heightMap.push(column);
      for (var y = 0; y < p.height; y++) {
        var detailNoise = fbm2D(detailSeed, x, y, p.detailOctaves, p.detailPersistence, p.detailLacunarity, p.detailScale);
        var macroNoise = fbm2D(macroSeed, x, y, p.macroOctaves, p.macroPersistence, p.macroLacunarity, p.macroScale);
        var detail = p.detailStrength * ((detailNoise * 2) - 1);
        var base = evaluateHeightProfile(macroNoise, p.heightProfileConfig) + p.baseHeightOffset;
        var heightValue = Math.round(base + detail);
        heightValue = Math.round(clamp(heightValue, p.minHeight, p.maxHeight));
        column.push(heightValue);
        minObserved = Math.min(minObserved, heightValue);
        maxObserved = Math.max(maxObserved, heightValue);
        total += heightValue;
        count += 1;
      }
    }
    return {
      params: p,
      heightMap: heightMap,
      minHeightObserved: count ? minObserved : 0,
      maxHeightObserved: count ? maxObserved : 0,
      avgHeightObserved: count ? (total / count) : 0,
      generatedCellCount: count
    };
  }

  function heightMapToVoxelStacks(heightMapResult) {
    var src = heightMapResult && typeof heightMapResult === 'object' ? heightMapResult : {};
    var map = Array.isArray(src.heightMap) ? src.heightMap : [];
    var params = normalizeTerrainParams(src.params || {});
    var stacks = [];
    var voxelCount = 0;
    var cellCount = 0;
    for (var x = 0; x < map.length; x++) {
      var column = Array.isArray(map[x]) ? map[x] : [];
      for (var y = 0; y < column.length; y++) {
        var heightValue = Math.max(0, Math.round(toNumber(column[y], 0)));
        if (heightValue <= 0) continue;
        cellCount += 1;
        voxelCount += heightValue;
        stacks.push({
          x: x,
          y: y,
          height: heightValue,
          isWater: heightValue < params.waterLevel
        });
      }
    }
    return {
      params: params,
      stacks: stacks,
      generatedCellCount: cellCount,
      generatedVoxelCount: voxelCount,
      minHeightObserved: toNumber(src.minHeightObserved, 0),
      maxHeightObserved: toNumber(src.maxHeightObserved, 0),
      avgHeightObserved: toNumber(src.avgHeightObserved, 0)
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    defaultSettings: JSON.parse(JSON.stringify(DEFAULT_SETTINGS)),
    defaultHeightProfile: cloneProfile(DEFAULT_HEIGHT_PROFILE),
    noise2D: noise2D,
    fbm2D: fbm2D,
    evaluateHeightProfile: evaluateHeightProfile,
    normalizeHeightProfileConfig: normalizeHeightProfileConfig,
    normalizeTerrainParams: normalizeTerrainParams,
    generateHeightMap: generateHeightMap,
    heightMapToVoxelStacks: heightMapToVoxelStacks
  };

  window.__TERRAIN_GENERATOR_CORE__ = api;
  if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
    window.__APP_NAMESPACE.bind('domain.terrainGeneratorCore', api, { owner: OWNER, phase: PHASE });
  }
})();
