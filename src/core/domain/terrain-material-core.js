(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/terrain-material-core.js';
  var PHASE = 'TERRAIN-MATERIAL-V1';

  function clampByte(value) {
    var n = Math.round(Number(value) || 0);
    if (n < 0) return 0;
    if (n > 255) return 255;
    return n;
  }

  function hexToRgb(hex) {
    var raw = String(hex || '').replace('#', '').trim();
    if (raw.length === 3) raw = raw.replace(/(.)/g, '$1$1');
    if (!/^[0-9a-fA-F]{6}$/.test(raw)) return { r: 127, g: 162, b: 247 };
    return {
      r: parseInt(raw.slice(0, 2), 16),
      g: parseInt(raw.slice(2, 4), 16),
      b: parseInt(raw.slice(4, 6), 16)
    };
  }

  function rgbToHex(rgb) {
    var src = rgb && typeof rgb === 'object' ? rgb : { r: 127, g: 162, b: 247 };
    function toHex(v) { return clampByte(v).toString(16).padStart(2, '0'); }
    return '#' + toHex(src.r) + toHex(src.g) + toHex(src.b);
  }

  function shiftColor(hex, delta) {
    var rgb = hexToRgb(hex);
    return rgbToHex({ r: rgb.r + delta, g: rgb.g + delta, b: rgb.b + delta });
  }

  var MATERIALS = {
    grass: {
      id: 'grass',
      label: 'Grass',
      mergeMaterialKey: 'terrain:grass',
      colors: {
        top: '#73b64f',
        side: '#5f8f3d',
        edge: '#3f5f27',
        soil: '#6f5a38'
      },
      patterns: {
        top: {
          size: 8,
          opacity: 0.58,
          pixels: [
            { x: 1, y: 1, color: '#8ecb66' }, { x: 5, y: 1, color: '#5b963d' },
            { x: 2, y: 3, color: '#95cf6d' }, { x: 6, y: 3, color: '#629d42' },
            { x: 0, y: 5, color: '#5b963d' }, { x: 3, y: 6, color: '#8ac462' }
          ]
        },
        side: {
          size: 8,
          opacity: 0.48,
          pixels: [
            { x: 0, y: 1, color: '#6fa949' }, { x: 4, y: 1, color: '#537d34' },
            { x: 2, y: 4, color: '#7c623f' }, { x: 6, y: 5, color: '#5a452c' }
          ]
        }
      }
    },
    sand: {
      id: 'sand',
      label: 'Sand',
      mergeMaterialKey: 'terrain:sand',
      colors: {
        top: '#d8c285',
        side: '#c5ae73',
        edge: '#8e7a4b'
      },
      patterns: {
        top: {
          size: 8,
          opacity: 0.54,
          pixels: [
            { x: 0, y: 1, color: '#e8d59a' }, { x: 3, y: 0, color: '#cdb271' },
            { x: 2, y: 3, color: '#e1cd91' }, { x: 6, y: 2, color: '#bea266' },
            { x: 1, y: 6, color: '#cdb271' }, { x: 5, y: 5, color: '#ead8a3' }
          ]
        },
        side: {
          size: 8,
          opacity: 0.42,
          pixels: [
            { x: 1, y: 1, color: '#d6c189' }, { x: 5, y: 2, color: '#b99d63' },
            { x: 2, y: 5, color: '#e5d39d' }
          ]
        }
      }
    },
    rock: {
      id: 'rock',
      label: 'Rock',
      mergeMaterialKey: 'terrain:rock',
      colors: {
        top: '#8f949b',
        side: '#757b84',
        edge: '#4f555d'
      },
      patterns: {
        top: {
          size: 8,
          opacity: 0.6,
          pixels: [
            { x: 1, y: 1, color: '#a7adb5' }, { x: 4, y: 1, color: '#747a82' },
            { x: 2, y: 4, color: '#666c74' }, { x: 5, y: 4, color: '#9ba1a9' },
            { x: 0, y: 6, color: '#6a7078' }, { x: 6, y: 6, color: '#b2b6bd' }
          ]
        },
        side: {
          size: 8,
          opacity: 0.5,
          pixels: [
            { x: 0, y: 2, color: '#8c9198' }, { x: 3, y: 3, color: '#636870' },
            { x: 6, y: 5, color: '#9da2a9' }
          ]
        }
      }
    }
  };

  function normalizeTerrainMaterialId(id) {
    var key = String(id == null ? '' : id).trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(MATERIALS, key)) return key;
    return 'grass';
  }

  function getTerrainMaterialDefinition(id) {
    return MATERIALS[normalizeTerrainMaterialId(id)] || MATERIALS.grass;
  }

  function resolveTerrainMaterialRenderSignature(id, faceType, variation) {
    var def = getTerrainMaterialDefinition(id);
    var face = String(faceType || 'top');
    var variant = String(variation || 'base');
    return [def.mergeMaterialKey, face, variant].join('|');
  }

  function getTerrainMaterialIdAt(materialMap, x, y, fallbackId) {
    var map = materialMap && typeof materialMap === 'object' ? materialMap : null;
    if (Array.isArray(map)) {
      var col = Array.isArray(map[x]) ? map[x] : null;
      if (col && col[y] != null) return normalizeTerrainMaterialId(col[y]);
    }
    if (map && typeof map === 'object') {
      var key = String(Math.round(Number(x) || 0)) + ',' + String(Math.round(Number(y) || 0));
      if (map[key] != null) return normalizeTerrainMaterialId(map[key]);
    }
    return normalizeTerrainMaterialId(fallbackId || 'grass');
  }

  function buildTerrainMaterialMap(heightMap, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var map = Array.isArray(heightMap) ? heightMap : [];
    var width = map.length;
    var height = width > 0 && Array.isArray(map[0]) ? map[0].length : 0;
    var waterLevel = Math.round(Number(opts.waterLevel) || 0);
    var minHeight = Math.round(Number(opts.minHeight) || 0);
    var maxHeight = Math.round(Number(opts.maxHeight) || 0);
    var rockCutoff = minHeight + Math.max(2, Math.round((maxHeight - minHeight) * 0.68));
    var out = [];
    for (var x = 0; x < width; x++) {
      var col = [];
      var srcCol = Array.isArray(map[x]) ? map[x] : [];
      for (var y = 0; y < height; y++) {
        var h = Math.round(Number(srcCol[y]) || 0);
        var zone = width > 1 ? (x / Math.max(1, width - 1)) : 0.5;
        var id = 'grass';
        if (zone < 0.34) id = 'sand';
        else if (zone > 0.68) id = 'rock';
        if (h <= waterLevel + 1 && zone < 0.55) id = 'sand';
        if (h >= rockCutoff) id = 'rock';
        col.push(id);
      }
      out.push(col);
    }
    return out;
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeTerrainMaterialId: normalizeTerrainMaterialId,
    getTerrainMaterialDefinition: getTerrainMaterialDefinition,
    resolveTerrainMaterialRenderSignature: resolveTerrainMaterialRenderSignature,
    getTerrainMaterialIdAt: getTerrainMaterialIdAt,
    buildTerrainMaterialMap: buildTerrainMaterialMap
  };

  try {
    window.__TERRAIN_MATERIAL_CORE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('core.terrainMaterial', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
