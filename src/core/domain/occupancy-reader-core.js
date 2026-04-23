(function () {
  if (typeof window === 'undefined') return;

  var OWNER = 'src/core/domain/occupancy-reader-core.js';
  var PHASE = 'OCCUPANCY-READER-V1';

  function normalizeCellKey(x, y, z) {
    return String(Math.round(Number(x) || 0)) + ',' + String(Math.round(Number(y) || 0)) + ',' + String(Math.round(Number(z) || 0));
  }

  function parseCellKey(key) {
    var text = String(key || '0,0,0');
    var parts = text.split(',');
    return {
      x: Math.round(Number(parts[0]) || 0),
      y: Math.round(Number(parts[1]) || 0),
      z: Math.round(Number(parts[2]) || 0)
    };
  }

  function createHasAdapter(source) {
    if (!source || typeof source !== 'object') return null;
    if (typeof source.has === 'function') {
      return function (key) { return source.has(String(key)); };
    }
    if (typeof source.isOccupied === 'function') {
      return function (key) {
        var parsed = parseCellKey(key);
        return source.isOccupied(parsed.x, parsed.y, parsed.z) === true;
      };
    }
    if (typeof source.get === 'function') {
      return function (key) { return !!source.get(String(key)); };
    }
    return null;
  }

  function collectValidationSamples(boxes) {
    var list = Array.isArray(boxes) ? boxes : [];
    var samples = [];
    for (var i = 0; i < list.length && samples.length < 8; i++) {
      var box = list[i];
      if (!box || typeof box !== 'object') continue;
      var x0 = Math.round(Number(box.x) || 0);
      var y0 = Math.round(Number(box.y) || 0);
      var z0 = Math.round(Number(box.z) || 0);
      var w = Math.max(1, Math.round(Number(box.w) || 1));
      var d = Math.max(1, Math.round(Number(box.d) || 1));
      var h = Math.max(1, Math.round(Number(box.h) || 1));
      samples.push(normalizeCellKey(x0, y0, z0));
      if (samples.length >= 8) break;
      samples.push(normalizeCellKey(x0 + w - 1, y0, z0));
      if (samples.length >= 8) break;
      samples.push(normalizeCellKey(x0, y0 + d - 1, z0));
      if (samples.length >= 8) break;
      samples.push(normalizeCellKey(x0, y0, z0 + h - 1));
    }
    return samples;
  }

  function createOccupancyReader(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var occupancy = opts.occupancy || null;
    var localBoxes = Array.isArray(opts.localBoxes) ? opts.localBoxes : [];
    var sourceLabel = opts.sourceLabel ? String(opts.sourceLabel) : 'unknown';
    var hasFn = createHasAdapter(occupancy);
    if (!hasFn) {
      return {
        valid: false,
        source: sourceLabel,
        fallbackReason: 'missing-has-adapter',
        validationSampleCount: 0,
        reader: null
      };
    }
    var samples = opts.validateLocalBoxes === false ? [] : collectValidationSamples(localBoxes);
    for (var i = 0; i < samples.length; i++) {
      if (!hasFn(samples[i])) {
        return {
          valid: false,
          source: sourceLabel,
          fallbackReason: 'validation-miss:' + samples[i],
          validationSampleCount: samples.length,
          reader: null
        };
      }
    }
    var reader = {
      has: function (keyOrX, y, z) {
        if (arguments.length === 1) return hasFn(String(keyOrX));
        return hasFn(normalizeCellKey(keyOrX, y, z));
      },
      isOccupied: function (x, y, z) {
        return hasFn(normalizeCellKey(x, y, z));
      }
    };
    return {
      valid: true,
      source: sourceLabel,
      fallbackReason: null,
      validationSampleCount: samples.length,
      reader: reader
    };
  }

  var api = {
    owner: OWNER,
    phase: PHASE,
    normalizeCellKey: normalizeCellKey,
    parseCellKey: parseCellKey,
    createOccupancyReader: createOccupancyReader
  };

  try {
    window.__OCCUPANCY_READER_CORE__ = api;
    if (window.__APP_NAMESPACE && typeof window.__APP_NAMESPACE.bind === 'function') {
      window.__APP_NAMESPACE.bind('core.occupancyReader', api, { owner: OWNER, phase: PHASE });
    }
  } catch (_) {}
})();
