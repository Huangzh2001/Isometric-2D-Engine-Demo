(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-generator-core.js';
  var PHASE = 'TERRAIN-GENERATOR-V3-COLLAPSIBLE-PERLIN-PARAMS';

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

  function clamp01(value) { return clamp(value, 0, 1); }

  function fract(value) {
    var v = Number(value) || 0;
    return v - Math.floor(v);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
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
    { start: 0.00, end: 0.25, baseHeight: -10 },
    { start: 0.25, end: 0.58, baseHeight: 5 },
    { start: 0.58, end: 0.60, baseHeight: 25 },
    { start: 0.60, end: 1.01, baseHeight: 25 }
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

  var TERRAIN_ALGORITHMS = {
    random_height: { id: 'random_height', label: 'Random', description: 'independent random height per cell.' },
    sin_wave: { id: 'sin_wave', label: 'Sin', description: 'periodic sine-wave terrain.' },
    perlin: { id: 'perlin', label: 'Perlin(x,z)', description: 'single smooth noise field with scale and offsets.' },
    perlin_octaves: { id: 'perlin_octaves', label: 'Perlin + Octaves', description: 'fBm noise with octave controls.' },
    multi_perlin: { id: 'multi_perlin', label: 'Multiple Perlin', description: 'weighted sum of multiple Perlin fields.' },
    profile_fbm: { id: 'profile_fbm', label: 'Perlin + Height Profile', description: 'macro fBm chooses a height profile band; detail fBm adds local variation.' }
  };

  function normalizeTerrainAlgorithm(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return 'profile_fbm';
    if (raw === 'random' || raw === 'rand') return 'random_height';
    if (raw === 'sin') return 'sin_wave';
    if (raw === 'simple_fbm' || raw === 'simple-fbm' || raw === 'fbm' || raw === 'noise') return 'perlin_octaves';
    if (raw === 'profile_perlin' || raw === 'profile-fbm' || raw === 'profile_fbm' || raw === 'profile' || raw === 'height_profile') return 'profile_fbm';
    if (raw === 'single_perlin') return 'perlin';
    if (raw === 'multiple_perlin') return 'multi_perlin';
    return TERRAIN_ALGORITHMS[raw] ? raw : 'profile_fbm';
  }

  var DEFAULT_SETTINGS = {
    seed: 1337,
    width: 11,
    height: 9,
    terrainAlgorithm: 'profile_fbm',

    sinScaleX: 8,
    sinScaleZ: 8,
    sinScaleY: 8,
    sinPhaseX: 0,
    sinPhaseZ: 0,
    sinPhaseY: 0,
    sinMixMode: 'add',

    perlinScale: 16,
    perlinOffsetX: 0,
    perlinOffsetZ: 0,

    octaveScale: 8,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2,
    octaveOffsetX: 0,
    octaveOffsetZ: 0,

    detailScale: 8,
    detailOctaves: 4,
    detailPersistence: 0.5,
    detailLacunarity: 2,
    detailStrength: 4,
    detailOffsetX: 0,
    detailOffsetZ: 0,

    multiScale1: 10,
    multiWeight1: 1,
    multiOffsetX1: 0,
    multiOffsetZ1: 0,
    multiSeedOffset1: 101,
    multiScale2: 22,
    multiWeight2: 0.65,
    multiOffsetX2: 0,
    multiOffsetZ2: 0,
    multiSeedOffset2: 202,
    multiScale3: 48,
    multiWeight3: 0.35,
    multiOffsetX3: 0,
    multiOffsetZ3: 0,
    multiSeedOffset3: 303,

    macroScale: 28,
    macroOctaves: 3,
    macroPersistence: 0.55,
    macroLacunarity: 2,
    macroOffsetX: 0,
    macroOffsetZ: 0,

    minHeight: -10,
    maxHeight: 25,
    waterLevel: 0,
    baseHeightOffset: 0,
    heightProfileConfig: DEFAULT_HEIGHT_PROFILE,

    terrainDebugFaceColorsEnabled: false,
    terrainColorMode: 'natural',
    terrainBuildColorMode: 'natural',
    terrainBuildLightingBypass: false,
    terrainDetailedProfilingEnabled: false
  };

  function readNumber(src, key, fallback) {
    if (!src || !Object.prototype.hasOwnProperty.call(src, key)) return fallback;
    return toNumber(src[key], fallback);
  }

  function normalizeTerrainParams(params) {
    var src = params && typeof params === 'object' ? params : {};
    var minHeight = Math.round(toNumber(src.minHeight, DEFAULT_SETTINGS.minHeight));
    var maxHeight = Math.round(toNumber(src.maxHeight, DEFAULT_SETTINGS.maxHeight));
    if (maxHeight < minHeight) {
      var tmp = minHeight;
      minHeight = maxHeight;
      maxHeight = tmp;
    }

    var octaveScale = readNumber(src, 'octaveScale', readNumber(src, 'detailScale', DEFAULT_SETTINGS.octaveScale));
    var octaves = readNumber(src, 'octaves', readNumber(src, 'detailOctaves', DEFAULT_SETTINGS.octaves));
    var persistence = readNumber(src, 'persistence', readNumber(src, 'detailPersistence', DEFAULT_SETTINGS.persistence));
    var lacunarity = readNumber(src, 'lacunarity', readNumber(src, 'detailLacunarity', DEFAULT_SETTINGS.lacunarity));

    return {
      seed: src.seed != null ? src.seed : DEFAULT_SETTINGS.seed,
      width: Math.max(1, Math.round(toNumber(src.width, DEFAULT_SETTINGS.width))),
      height: Math.max(1, Math.round(toNumber(src.height, DEFAULT_SETTINGS.height))),
      terrainAlgorithm: normalizeTerrainAlgorithm(src.terrainAlgorithm || src.algorithm || DEFAULT_SETTINGS.terrainAlgorithm),

      sinScaleX: Math.max(0.0001, readNumber(src, 'sinScaleX', DEFAULT_SETTINGS.sinScaleX)),
      sinScaleZ: Math.max(0.0001, readNumber(src, 'sinScaleZ', readNumber(src, 'sinScaleY', DEFAULT_SETTINGS.sinScaleZ))),
      sinScaleY: Math.max(0.0001, readNumber(src, 'sinScaleZ', readNumber(src, 'sinScaleY', DEFAULT_SETTINGS.sinScaleZ))),
      sinPhaseX: readNumber(src, 'sinPhaseX', DEFAULT_SETTINGS.sinPhaseX),
      sinPhaseZ: readNumber(src, 'sinPhaseZ', readNumber(src, 'sinPhaseY', DEFAULT_SETTINGS.sinPhaseZ)),
      sinPhaseY: readNumber(src, 'sinPhaseZ', readNumber(src, 'sinPhaseY', DEFAULT_SETTINGS.sinPhaseZ)),
      sinMixMode: String(src.sinMixMode || DEFAULT_SETTINGS.sinMixMode),

      perlinScale: Math.max(0.0001, readNumber(src, 'perlinScale', DEFAULT_SETTINGS.perlinScale)),
      perlinOffsetX: readNumber(src, 'perlinOffsetX', DEFAULT_SETTINGS.perlinOffsetX),
      perlinOffsetZ: readNumber(src, 'perlinOffsetZ', DEFAULT_SETTINGS.perlinOffsetZ),

      octaveScale: Math.max(0.0001, octaveScale),
      octaves: normalizeOctaves(octaves, DEFAULT_SETTINGS.octaves),
      persistence: clamp(persistence, 0, 1.5),
      lacunarity: Math.max(1, lacunarity),
      octaveOffsetX: readNumber(src, 'octaveOffsetX', DEFAULT_SETTINGS.octaveOffsetX),
      octaveOffsetZ: readNumber(src, 'octaveOffsetZ', DEFAULT_SETTINGS.octaveOffsetZ),

      detailScale: Math.max(0.0001, readNumber(src, 'detailScale', DEFAULT_SETTINGS.detailScale)),
      detailOctaves: normalizeOctaves(readNumber(src, 'detailOctaves', DEFAULT_SETTINGS.detailOctaves), DEFAULT_SETTINGS.detailOctaves),
      detailPersistence: clamp(readNumber(src, 'detailPersistence', DEFAULT_SETTINGS.detailPersistence), 0, 1.5),
      detailLacunarity: Math.max(1, readNumber(src, 'detailLacunarity', DEFAULT_SETTINGS.detailLacunarity)),
      detailStrength: readNumber(src, 'detailStrength', DEFAULT_SETTINGS.detailStrength),
      detailOffsetX: readNumber(src, 'detailOffsetX', DEFAULT_SETTINGS.detailOffsetX),
      detailOffsetZ: readNumber(src, 'detailOffsetZ', DEFAULT_SETTINGS.detailOffsetZ),

      multiScale1: Math.max(0.0001, readNumber(src, 'multiScale1', DEFAULT_SETTINGS.multiScale1)),
      multiWeight1: Math.max(0, readNumber(src, 'multiWeight1', DEFAULT_SETTINGS.multiWeight1)),
      multiOffsetX1: readNumber(src, 'multiOffsetX1', DEFAULT_SETTINGS.multiOffsetX1),
      multiOffsetZ1: readNumber(src, 'multiOffsetZ1', DEFAULT_SETTINGS.multiOffsetZ1),
      multiSeedOffset1: Math.round(readNumber(src, 'multiSeedOffset1', DEFAULT_SETTINGS.multiSeedOffset1)),
      multiScale2: Math.max(0.0001, readNumber(src, 'multiScale2', DEFAULT_SETTINGS.multiScale2)),
      multiWeight2: Math.max(0, readNumber(src, 'multiWeight2', DEFAULT_SETTINGS.multiWeight2)),
      multiOffsetX2: readNumber(src, 'multiOffsetX2', DEFAULT_SETTINGS.multiOffsetX2),
      multiOffsetZ2: readNumber(src, 'multiOffsetZ2', DEFAULT_SETTINGS.multiOffsetZ2),
      multiSeedOffset2: Math.round(readNumber(src, 'multiSeedOffset2', DEFAULT_SETTINGS.multiSeedOffset2)),
      multiScale3: Math.max(0.0001, readNumber(src, 'multiScale3', DEFAULT_SETTINGS.multiScale3)),
      multiWeight3: Math.max(0, readNumber(src, 'multiWeight3', DEFAULT_SETTINGS.multiWeight3)),
      multiOffsetX3: readNumber(src, 'multiOffsetX3', DEFAULT_SETTINGS.multiOffsetX3),
      multiOffsetZ3: readNumber(src, 'multiOffsetZ3', DEFAULT_SETTINGS.multiOffsetZ3),
      multiSeedOffset3: Math.round(readNumber(src, 'multiSeedOffset3', DEFAULT_SETTINGS.multiSeedOffset3)),

      macroScale: Math.max(0.0001, readNumber(src, 'macroScale', DEFAULT_SETTINGS.macroScale)),
      macroOctaves: normalizeOctaves(readNumber(src, 'macroOctaves', DEFAULT_SETTINGS.macroOctaves), DEFAULT_SETTINGS.macroOctaves),
      macroPersistence: clamp(readNumber(src, 'macroPersistence', DEFAULT_SETTINGS.macroPersistence), 0, 1.5),
      macroLacunarity: Math.max(1, readNumber(src, 'macroLacunarity', DEFAULT_SETTINGS.macroLacunarity)),
      macroOffsetX: readNumber(src, 'macroOffsetX', DEFAULT_SETTINGS.macroOffsetX),
      macroOffsetZ: readNumber(src, 'macroOffsetZ', DEFAULT_SETTINGS.macroOffsetZ),

      minHeight: minHeight,
      maxHeight: maxHeight,
      waterLevel: Math.round(toNumber(src.waterLevel, DEFAULT_SETTINGS.waterLevel)),
      baseHeightOffset: Math.round(toNumber(src.baseHeightOffset, DEFAULT_SETTINGS.baseHeightOffset)),
      heightProfileConfig: normalizeHeightProfileConfig(src.heightProfileConfig),

      terrainDebugFaceColorsEnabled: src.terrainDebugFaceColorsEnabled === true,
      terrainColorMode: String(src.terrainColorMode || (src.terrainDebugFaceColorsEnabled ? 'debug-semantic' : 'natural')),
      terrainBuildColorMode: String(src.terrainBuildColorMode || 'natural'),
      terrainBuildLightingBypass: src.terrainBuildLightingBypass === true,
      terrainDetailedProfilingEnabled: src.terrainDetailedProfilingEnabled === true
    };
  }

  function remap01ToHeight(value01, params) {
    var range = Math.max(0, params.maxHeight - params.minHeight);
    var heightValue = Math.round(params.minHeight + (clamp01(value01) * range) + params.baseHeightOffset);
    return Math.round(clamp(heightValue, params.minHeight, params.maxHeight));
  }

  function singlePerlin(seed, x, y, scale, offsetX, offsetZ) {
    var safeScale = Math.max(0.0001, toNumber(scale, 16));
    return noise2D(seed, (toNumber(x, 0) + toNumber(offsetX, 0)) / safeScale, (toNumber(y, 0) + toNumber(offsetZ, 0)) / safeScale);
  }

  function generateHeightMap(params) {
    var p = normalizeTerrainParams(params);
    var seed = normalizeSeed(p.seed);
    var heightMap = [];
    var minObserved = Infinity;
    var maxObserved = -Infinity;
    var total = 0;
    var count = 0;

    for (var x = 0; x < p.width; x++) {
      var column = [];
      heightMap.push(column);
      for (var y = 0; y < p.height; y++) {
        var heightValue = 0;

        if (p.terrainAlgorithm === 'random_height') {
          heightValue = remap01ToHeight(hash2D(seed, x, y), p);
        } else if (p.terrainAlgorithm === 'sin_wave') {
          var sx = (Math.sin((x / p.sinScaleX) + p.sinPhaseX) + 1) / 2;
          var sz = (Math.sin((y / p.sinScaleZ) + p.sinPhaseZ) + 1) / 2;
          var sinValue = p.sinMixMode === 'multiply' ? (sx * sz) : ((sx + sz) / 2);
          heightValue = remap01ToHeight(sinValue, p);
        } else if (p.terrainAlgorithm === 'perlin') {
          heightValue = remap01ToHeight(singlePerlin(seed + 17, x, y, p.perlinScale, p.perlinOffsetX, p.perlinOffsetZ), p);
        } else if (p.terrainAlgorithm === 'perlin_octaves') {
          var octaveNoise = fbm2D(seed + 17, x + p.octaveOffsetX, y + p.octaveOffsetZ, p.octaves, p.persistence, p.lacunarity, p.octaveScale);
          heightValue = remap01ToHeight(octaveNoise, p);
        } else if (p.terrainAlgorithm === 'multi_perlin') {
          var w1 = Math.max(0, p.multiWeight1);
          var w2 = Math.max(0, p.multiWeight2);
          var w3 = Math.max(0, p.multiWeight3);
          var weightSum = w1 + w2 + w3;
          if (weightSum <= 0) weightSum = 1;
          var multiNoise = (
            w1 * singlePerlin(seed + p.multiSeedOffset1, x, y, p.multiScale1, p.multiOffsetX1, p.multiOffsetZ1) +
            w2 * singlePerlin(seed + p.multiSeedOffset2, x, y, p.multiScale2, p.multiOffsetX2, p.multiOffsetZ2) +
            w3 * singlePerlin(seed + p.multiSeedOffset3, x, y, p.multiScale3, p.multiOffsetX3, p.multiOffsetZ3)
          ) / weightSum;
          heightValue = remap01ToHeight(multiNoise, p);
        } else {
          var macroNoise = fbm2D(seed + 1000003, x + p.macroOffsetX, y + p.macroOffsetZ, p.macroOctaves, p.macroPersistence, p.macroLacunarity, p.macroScale);
          var detailNoise = fbm2D(seed + 17, x + p.detailOffsetX, y + p.detailOffsetZ, p.detailOctaves, p.detailPersistence, p.detailLacunarity, p.detailScale);
          var base = evaluateHeightProfile(macroNoise, p.heightProfileConfig);
          var detail = p.detailStrength * ((detailNoise * 2) - 1);
          heightValue = Math.round(base + detail + p.baseHeightOffset);
          heightValue = Math.round(clamp(heightValue, p.minHeight, p.maxHeight));
        }

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
    terrainAlgorithms: JSON.parse(JSON.stringify(TERRAIN_ALGORITHMS)),
    normalizeTerrainAlgorithm: normalizeTerrainAlgorithm,
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
