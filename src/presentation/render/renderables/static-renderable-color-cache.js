// P11a-6: Static renderable color/lighting cache helpers.
// Layer: presentation/render/renderables.
//
// Owns cached base-face palette lookup, RGB->CSS conversion, static renderable
// color mode/signature decisions, and cached fill construction for static world
// renderable build paths. Runtime state, terrain settings, lighting, palette, and
// material readers remain injected by render.js so this owner does not read scene
// globals directly.
(function registerStaticRenderableColorCache(global) {
  var __baseFaceColorCache = new Map();
  var __cssCache = new Map();
  var __colorCacheState = { scopeSignature: '', map: new Map() };

  function asNumber(value, fallback) {
    var n = Number(value);
    return Number.isFinite(n) ? n : Number(fallback || 0);
  }

  function requireFn(deps, name) {
    if (deps && typeof deps[name] === 'function') return deps[name];
    throw new Error('static-renderable-color-cache requires injected ' + name + ' dependency');
  }

  function optionalFn(deps, name) {
    return deps && typeof deps[name] === 'function' ? deps[name] : null;
  }

  function getTerrainSettings(deps, terrainSettings) {
    if (terrainSettings && typeof terrainSettings === 'object') return terrainSettings;
    var getTerrainRenderSettingsForRender = requireFn(deps, 'getTerrainRenderSettingsForRender');
    return getTerrainRenderSettingsForRender() || {};
  }

  function getCachedBaseFaceColorsForRenderable(base, deps) {
    var baseFaceColors = requireFn(deps, 'baseFaceColors');
    var key = String(base || '#7aa2f7');
    if (__baseFaceColorCache.has(key)) return __baseFaceColorCache.get(key);
    var fc = baseFaceColors(key);
    __baseFaceColorCache.set(key, fc);
    return fc;
  }

  function rgbToCssCachedForRenderable(rgb, a, deps) {
    var rgbToCss = requireFn(deps, 'rgbToCss');
    var alpha = a == null ? 1 : Number(a);
    var rr = Math.round(asNumber(rgb && rgb.r, 0));
    var gg = Math.round(asNumber(rgb && rgb.g, 0));
    var bb = Math.round(asNumber(rgb && rgb.b, 0));
    var aa = Math.max(0, Math.min(1, alpha));
    var key = rr + ',' + gg + ',' + bb + ',' + aa.toFixed(3);
    if (__cssCache.has(key)) return __cssCache.get(key);
    var css = rgbToCss({ r: rr, g: gg, b: bb }, aa);
    __cssCache.set(key, css);
    return css;
  }

  function getStaticRenderableBuildColorModeForRender(terrainSettings, deps) {
    var settings = getTerrainSettings(deps, terrainSettings);
    if (settings && settings.terrainDebugFaceColorsEnabled === true) return 'debug-semantic';
    return String((settings && settings.terrainBuildColorMode) || (settings && settings.terrainColorMode) || 'natural');
  }

  function isStaticRenderableBuildLightingBypassEnabled(terrainSettings, deps) {
    var settings = getTerrainSettings(deps, terrainSettings);
    return !!(settings && settings.terrainBuildLightingBypass === true);
  }

  function isStaticRenderableLightingUiEnabledForBuild(deps) {
    var getLightStateForRender = optionalFn(deps, 'getLightStateForRender');
    var lightState = getLightStateForRender ? getLightStateForRender() : null;
    return !!(lightState && lightState.enabled !== false);
  }

  function isStaticRenderableLightingActiveForBuild(terrainSettings, deps) {
    if (isStaticRenderableBuildLightingBypassEnabled(terrainSettings, deps)) return false;
    return isStaticRenderableLightingUiEnabledForBuild(deps);
  }

  function getStaticRenderableBuildLightingSignature(terrainSettings, deps) {
    if (isStaticRenderableBuildLightingBypassEnabled(terrainSettings, deps)) return 'lighting:bypass';
    if (!isStaticRenderableLightingUiEnabledForBuild(deps)) return 'lighting:off';
    var staticBoxLightingSignature = optionalFn(deps, 'staticBoxLightingSignature');
    return String(staticBoxLightingSignature ? staticBoxLightingSignature() : 'lighting:none');
  }

  function getStaticRenderableActualColorPathUsed(terrainSettings, deps) {
    var mode = getStaticRenderableBuildColorModeForRender(terrainSettings, deps);
    if (isStaticRenderableBuildLightingBypassEnabled(terrainSettings, deps)) return String(mode || 'natural') + '+lightingBypass';
    if (!isStaticRenderableLightingUiEnabledForBuild(deps)) return String(mode || 'natural') + '+lightingOff';
    return String(mode || 'natural') + '+lighting';
  }

  function getStaticRenderableFlatDebugFillRgb(semanticFace) {
    var face = String(semanticFace || 'top');
    if (face === 'top') return { r: 110, g: 203, b: 255 };
    if (face === 'east') return { r: 70, g: 150, b: 245 };
    if (face === 'south') return { r: 44, g: 114, b: 208 };
    if (face === 'west') return { r: 70, g: 150, b: 245 };
    if (face === 'north') return { r: 44, g: 114, b: 208 };
    return { r: 110, g: 203, b: 255 };
  }

  function getStaticRenderableColorScopeSignature(currentViewRotation, deps) {
    var terrainSettings = getTerrainSettings(deps);
    var buildColorMode = getStaticRenderableBuildColorModeForRender(terrainSettings, deps);
    var lightingSignature = getStaticRenderableBuildLightingSignature(terrainSettings, deps);
    return [buildColorMode, lightingSignature, Number(currentViewRotation || 0)].join('|');
  }

  function ensureStaticRenderableColorCacheScope(currentViewRotation, deps) {
    var scopeSignature = getStaticRenderableColorScopeSignature(currentViewRotation, deps);
    if (__colorCacheState.scopeSignature !== scopeSignature) {
      __colorCacheState.scopeSignature = scopeSignature;
      __colorCacheState.map = new Map();
    }
    return {
      scopeSignature: scopeSignature,
      map: __colorCacheState.map
    };
  }

  function getStaticRenderableColorCacheMeta(cell, semanticFace, currentViewRotation, terrainSettings, deps) {
    var settings = getTerrainSettings(deps, terrainSettings);
    var getTerrainMaterialIdForRenderCell = requireFn(deps, 'getTerrainMaterialIdForRenderCell');
    var buildColorMode = getStaticRenderableBuildColorModeForRender(settings, deps);
    var lightingSignature = getStaticRenderableBuildLightingSignature(settings, deps);
    var lightingBypass = isStaticRenderableBuildLightingBypassEnabled(settings, deps);
    var x = asNumber(cell && cell.x, 0);
    var y = asNumber(cell && cell.y, 0);
    var z = asNumber(cell && cell.z, 0);
    var isTerrain = !!(cell && cell.generatedBy === 'terrain-generator');
    var spatialBucketSize = isTerrain ? 4 : 1;
    var xBucket = Math.floor(x / spatialBucketSize);
    var yBucket = Math.floor(y / spatialBucketSize);
    var faceCenterZ = semanticFace === 'top' ? z + 1 : z + 0.5;
    var heightBucketIndex = Math.round(faceCenterZ * 2);
    var heightBucket = heightBucketIndex / 2;
    var terrainMaterialIdForMeta = getTerrainMaterialIdForRenderCell(cell);
    var materialType = String(terrainMaterialIdForMeta || (cell && (cell.materialType || cell.terrainBand || cell.base)) || '#7aa2f7');
    var key = [buildColorMode, semanticFace, materialType, heightBucketIndex, xBucket, yBucket, lightingSignature, Number(currentViewRotation || 0)].join('|');
    return {
      key: key,
      terrainColorMode: buildColorMode,
      dominantFaceType: String(semanticFace || 'top'),
      dominantMaterialType: materialType,
      dominantHeightBucket: heightBucket,
      lightingSignature: lightingSignature,
      packetViewRotation: Number(currentViewRotation || 0),
      debugFaceColorsEnabled: settings && settings.terrainDebugFaceColorsEnabled === true,
      terrainBuildLightingBypass: lightingBypass,
      xBucket: xBucket,
      yBucket: yBucket
    };
  }

  function incrementColorStatsMap(map, key, delta) {
    if (!map || typeof map.set !== 'function' || typeof map.get !== 'function') return;
    map.set(key, Number(map.get(key) || 0) + Number(delta || 1));
  }

  function trackColorKeyUsage(colorStats, meta) {
    if (!colorStats || !colorStats.colorKeyUsage || typeof colorStats.colorKeyUsage.set !== 'function') return;
    var existing = colorStats.colorKeyUsage.get(meta.key) || null;
    colorStats.colorKeyUsage.set(meta.key, {
      count: Number((existing && existing.count) || 0) + 1,
      terrainColorMode: meta.terrainColorMode,
      dominantFaceType: meta.dominantFaceType,
      dominantMaterialType: meta.dominantMaterialType,
      dominantHeightBucket: meta.dominantHeightBucket
    });
  }

  function getCachedStaticRenderableFill(cell, semanticFace, worldPts, normal, currentViewRotation, colorStats, deps) {
    var getTerrainRenderSettingsForRender = requireFn(deps, 'getTerrainRenderSettingsForRender');
    var perfNow = requireFn(deps, 'perfNow');
    var getTerrainMaterialBaseFaceColorsForRenderCell = requireFn(deps, 'getTerrainMaterialBaseFaceColorsForRenderCell');
    var getBaseFaceFillRgbForSemanticFace = requireFn(deps, 'getBaseFaceFillRgbForSemanticFace');
    var litFaceColor = requireFn(deps, 'litFaceColor');
    var terrainSettings = getTerrainRenderSettingsForRender() || {};
    var scope = ensureStaticRenderableColorCacheScope(currentViewRotation, deps);
    var cacheLookupStartAt = perfNow();
    var missHeightBucketStartAt = perfNow();
    var meta = getStaticRenderableColorCacheMeta(cell, semanticFace, currentViewRotation, terrainSettings, deps);
    var metaBuildMs = Math.max(0, perfNow() - missHeightBucketStartAt);
    var cached = scope.map.get(meta.key);
    var cacheLookupMs = Math.max(0, perfNow() - cacheLookupStartAt);
    if (colorStats) colorStats.step4a_colorCacheLookupMs += cacheLookupMs;
    if (cached) {
      if (colorStats) {
        var hitFastPathStartAt = perfNow();
        colorStats.colorCacheHitCount += 1;
        trackColorKeyUsage(colorStats, meta);
        incrementColorStatsMap(colorStats.actualColorPathUsedCounts, getStaticRenderableActualColorPathUsed(terrainSettings, deps), 1);
        colorStats.step4b_colorCacheHitFastPathMs += Math.max(0, perfNow() - hitFastPathStartAt);
        colorStats.touchedColorCachePath = true;
      }
      return { fill: cached.fill, meta: meta, cacheHit: true };
    }
    var missPathStartAt = perfNow();
    var paletteLookupStartAt = perfNow();
    var buildColorMode = getStaticRenderableBuildColorModeForRender(terrainSettings, deps);
    var baseRgb;
    if (buildColorMode === 'flat_debug') baseRgb = getStaticRenderableFlatDebugFillRgb(semanticFace);
    else if (buildColorMode === 'debug-semantic') baseRgb = getStaticRenderableFlatDebugFillRgb(semanticFace);
    else {
      var terrainFc = getTerrainMaterialBaseFaceColorsForRenderCell(cell);
      var fc = terrainFc || getCachedBaseFaceColorsForRenderable((cell && cell.base) || '#7aa2f7', deps);
      baseRgb = getBaseFaceFillRgbForSemanticFace(fc, semanticFace);
    }
    var paletteLookupMs = Math.max(0, perfNow() - paletteLookupStartAt);
    var materialColorStartAt = perfNow();
    var fillBaseRgb = { r: asNumber(baseRgb && baseRgb.r, 0), g: asNumber(baseRgb && baseRgb.g, 0), b: asNumber(baseRgb && baseRgb.b, 0) };
    var materialColorMs = Math.max(0, perfNow() - materialColorStartAt);
    var lightingMixStartAt = perfNow();
    var lightingActive = isStaticRenderableLightingActiveForBuild(terrainSettings, deps);
    var fillRgb = lightingActive
      ? litFaceColor(fillBaseRgb, worldPts, normal, cell && cell.instanceId || null)
      : fillBaseRgb;
    var lightingMixMs = Math.max(0, perfNow() - lightingMixStartAt);
    var cssBuildStartAt = perfNow();
    var fill = rgbToCssCachedForRenderable(fillRgb, 1, deps);
    var cssBuildMs = Math.max(0, perfNow() - cssBuildStartAt);
    if (colorStats) colorStats.step4c_colorMissPathMs += Math.max(0, perfNow() - missPathStartAt);
    scope.map.set(meta.key, { fill: fill });
    if (colorStats) {
      colorStats.colorCacheMissCount += 1;
      trackColorKeyUsage(colorStats, meta);
      incrementColorStatsMap(colorStats.actualColorPathUsedCounts, getStaticRenderableActualColorPathUsed(terrainSettings, deps), 1);
      colorStats.miss_step1_paletteLookupMs += paletteLookupMs;
      colorStats.miss_step2_heightBucketMs += metaBuildMs;
      colorStats.miss_step3_materialColorMs += materialColorMs;
      colorStats.miss_step4_lightingMixMs += lightingMixMs;
      colorStats.miss_step5_cssOrObjectBuildMs += cssBuildMs;
      colorStats.touchedNaturalColorPath = buildColorMode === 'natural';
      colorStats.touchedLightingPath = lightingActive;
    }
    return { fill: fill, meta: meta, cacheHit: false };
  }

  var api = {
    layer: 'presentation/render/renderables',
    phase: 'P11a-6',
    getCachedBaseFaceColorsForRenderable: getCachedBaseFaceColorsForRenderable,
    rgbToCssCachedForRenderable: rgbToCssCachedForRenderable,
    getStaticRenderableBuildColorModeForRender: getStaticRenderableBuildColorModeForRender,
    isStaticRenderableBuildLightingBypassEnabled: isStaticRenderableBuildLightingBypassEnabled,
    isStaticRenderableLightingUiEnabledForBuild: isStaticRenderableLightingUiEnabledForBuild,
    isStaticRenderableLightingActiveForBuild: isStaticRenderableLightingActiveForBuild,
    getStaticRenderableBuildLightingSignature: getStaticRenderableBuildLightingSignature,
    getStaticRenderableActualColorPathUsed: getStaticRenderableActualColorPathUsed,
    getStaticRenderableFlatDebugFillRgb: getStaticRenderableFlatDebugFillRgb,
    getStaticRenderableColorScopeSignature: getStaticRenderableColorScopeSignature,
    ensureStaticRenderableColorCacheScope: ensureStaticRenderableColorCacheScope,
    getStaticRenderableColorCacheMeta: getStaticRenderableColorCacheMeta,
    getCachedStaticRenderableFill: getCachedStaticRenderableFill
  };

  global.IsometricStaticRenderableColorCache = api;
  global.__STATIC_RENDERABLE_COLOR_CACHE__ = api;
  global.__APP_PRESENTATION_STATIC_RENDERABLE_COLOR_CACHE__ = api;
})(typeof window !== 'undefined' ? window : globalThis);
