// Habbo is an import source for the unified image/voxel editor.
// It is converted immediately into the same four-facing, layered pixel document
// used by PNG/WebP and future sources. No Habbo-specific editing surface exists.
(function (global) {
  'use strict';

  var Runtime = global.HabboCalibrationRuntime;
  var Editor = global.App && global.App.editor && global.App.editor.unifiedV18;
  var core = global.__HZH_PIXEL_ART_CORE__;
  if (!Runtime || !Editor || !core || typeof Editor.applyImportedHabboAsset !== 'function') return;

  function byId(id) { return document.getElementById(id); }
  function num(value, fallback) { var n = Number(value); return Number.isFinite(n) ? n : Number(fallback || 0); }
  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
  function safeName(value) { return String(value || 'habbo').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '') || 'habbo'; }
  function setStatus(message, ok) {
    try { if (typeof Editor.setStatus === 'function') Editor.setStatus(String(message || ''), ok !== false); } catch (_) {}
    var top = byId('pixelTopState'); if (top) top.textContent = ok === false ? '导入失败' : String(message || '').slice(0, 16);
    var source = byId('pixelSourceSummary'); if (source && message) source.textContent = String(message);
  }
  function detail(message) { try { if (typeof Editor.detailLog === 'function') Editor.detailLog('habbo-generic-import:' + String(message || '')); } catch (_) {} }
  function hashBytes(bytes) {
    if (!global.crypto || !global.crypto.subtle) return Promise.resolve('');
    return global.crypto.subtle.digest('SHA-256', bytes).then(function (digest) {
      return Array.from(new Uint8Array(digest)).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }).catch(function () { return ''; });
  }

  function normalizeDirectionList(values) {
    return (Array.isArray(values) ? values : []).map(Number).filter(function (value, index, array) {
      return Number.isFinite(value) && array.indexOf(value) === index;
    }).sort(function (a, b) { return a - b; });
  }

  function sourceDirections(runtime, preferredSize) {
    var meta = runtime.meta;
    var vis = Runtime.chooseHabboVisualization(meta, preferredSize);
    // The directions declared by the selected visualization size are authoritative.
    // Unioning directions from other sizes used to inject direction 0 from the 1px
    // fallback visualization (for example bling_bed), which selected the wrong art.
    var selected = normalizeDirectionList(vis && vis.directions);
    if (selected.length) return selected;
    var assetDirections = [];
    (meta.assets || []).forEach(function (asset) {
      if (!asset || asset.kind === 'icon' || !Number.isFinite(Number(asset.direction))) return;
      var size = Number(asset.size);
      if (Number.isFinite(size) && size > 0 && size !== Number(preferredSize)) return;
      assetDirections.push(Number(asset.direction));
    });
    var fromAssets = normalizeDirectionList(assetDirections);
    if (fromAssets.length) return fromAssets;
    return normalizeDirectionList(meta.visualDirections).length ? normalizeDirectionList(meta.visualDirections) : [0];
  }

  function layerProps(vis, layerId, direction) {
    if (!vis) return { x: 0, y: 0, z: 0, alpha: null, ink: '' };
    var base = layerId === vis.layerCount ? { x: 0, y: 0, z: 0, alpha: 51, ink: '' } : (vis.layers[layerId] || { x: 0, y: 0, z: 0, alpha: null, ink: '' });
    var directional = vis.directionLayers && vis.directionLayers[String(Number(direction) || 0)] ? vis.directionLayers[String(Number(direction) || 0)][layerId] : null;
    return Object.assign({}, base, directional || {});
  }

  function applyGeneratedMirrorSpatialRule(layers, mirrorX) {
    if (!mirrorX || !Array.isArray(layers) || !layers.length) return layers;
    // Habbo aliases can flip the bitmap of each layer, but an opposite facing also
    // has to reflect the layer registration positions as one assembled object.
    // Reflecting each bitmap in place leaves segmented furniture exploded.
    var structural = layers.filter(function (layer) {
      return layer && layer.kind !== 'shadow' && Number(layer.width) > 1 && Number(layer.height) > 1;
    });
    if (structural.length < 2) return layers;
    var minX = Math.min.apply(Math, structural.map(function (layer) { return Number(layer.x) || 0; }));
    var maxX = Math.max.apply(Math, structural.map(function (layer) { return (Number(layer.x) || 0) + (Number(layer.width) || 0); }));
    var reflectionSum = minX + maxX;
    structural.forEach(function (layer) {
      var oldX = Number(layer.x) || 0;
      var reflectedX = reflectionSum - (oldX + (Number(layer.width) || 0));
      // Central layers often differ by one pixel because Habbo bitmap widths are odd.
      // Preserve their native registration rather than introducing a visible jitter.
      if (Math.abs(reflectedX - oldX) <= 1) reflectedX = oldX;
      layer.generatedMirrorShiftX = reflectedX - oldX;
      layer.x = reflectedX;
    });
    return layers;
  }

  function normalizeQuarterTurnsFromSourceDirection(direction) {
    var numeric = Number(direction);
    if (!Number.isFinite(numeric)) return 0;
    return ((Math.round(numeric / 2) % 4) + 4) % 4;
  }

  function rotateDimensions(rawX, rawY, quarterTurns) {
    return (quarterTurns % 2) ? { w: rawY, d: rawX } : { w: rawX, d: rawY };
  }

  function rotateAnchorCell(rawX, rawY, quarterTurns) {
    switch (((quarterTurns % 4) + 4) % 4) {
      case 1: return { x: 0, y: Math.max(0, rawX - 1) };
      case 2: return { x: Math.max(0, rawX - 1), y: Math.max(0, rawY - 1) };
      case 3: return { x: Math.max(0, rawY - 1), y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  function inverseIsoPoint(screenX, screenY) {
    return {
      x: num(screenX, 0) / 64 + num(screenY, 0) / 32,
      y: num(screenY, 0) / 32 - num(screenX, 0) / 64
    };
  }

  function buildShadowRegistrationDiagnostic(facingModel, inference) {
    var layers = facingModel && Array.isArray(facingModel.layers) ? facingModel.layers : [];
    var shadow = layers.find(function (layer) { return layer && layer.kind === 'shadow' && Number(layer.width) > 1 && Number(layer.height) > 1; });
    if (!shadow) return { available: false, confidence: 'no-shadow' };
    var shadowCenterScreen = {
      x: num(shadow.x, 0) + num(shadow.width, 0) / 2,
      y: num(shadow.y, 0) + num(shadow.height, 0) / 2
    };
    var observed = inverseIsoPoint(shadowCenterScreen.x, shadowCenterScreen.y);
    var footprintCenter = { x: inference.w / 2, y: inference.d / 2 };
    var expected = {
      x: footprintCenter.x - inference.localRegistration.x,
      y: footprintCenter.y - inference.localRegistration.y
    };
    var error = Math.hypot(observed.x - expected.x, observed.y - expected.y);
    return {
      available: true,
      sourceDirection: Number(facingModel.sourceDirection) || 0,
      observedShadowCenterFromRegistrationCells: { x: observed.x, y: observed.y },
      expectedFootprintCenterFromRegistrationCells: expected,
      errorCells: error,
      confidence: error <= 0.22 ? 'high' : (error <= 0.55 ? 'medium' : 'low')
    };
  }

  function inferHabboFootprint(meta, facingModels) {
    var dimensions = meta && meta.dimensions ? meta.dimensions : {};
    var rawX = Math.max(1, Math.round(num(dimensions.x, 1)));
    var rawY = Math.max(1, Math.round(num(dimensions.y, 1)));
    var rawZ = Math.max(1, Math.round(num(dimensions.z, 1)));
    var firstFacing = Array.isArray(facingModels) && facingModels.length ? facingModels[0] : null;
    var sourceDirection = Number(firstFacing && firstFacing.sourceDirection) || 0;
    var quarterTurns = normalizeQuarterTurnsFromSourceDirection(sourceDirection);
    var rotatedDimensions = rotateDimensions(rawX, rawY, quarterTurns);
    var anchorCell = rotateAnchorCell(rawX, rawY, quarterTurns);
    var w = rotatedDimensions.w;
    var d = rotatedDimensions.d;
    var cells = [];
    for (var y = 0; y < d; y += 1) for (var x = 0; x < w; x += 1) cells.push({ x: x, y: y });
    var inference = {
      w: w,
      d: d,
      h: rawZ,
      cells: cells,
      sourceDimensions: { x: rawX, y: rawY, z: rawZ },
      sourceDirection: sourceDirection,
      sourceQuarterTurns: quarterTurns,
      anchorCell: { x: anchorCell.x, y: anchorCell.y, z: 0 },
      // Habbo layer x/y registration is relative to the centre of the
      // direction-specific position tile, not to the rectangle centre.
      localRegistration: { x: anchorCell.x + 0.5, y: anchorCell.y + 0.5, z: 0 },
      rule: 'habbo-position-tile-footprint-registration-v3',
      confidence: 'metadata-plus-position-tile-convention',
      translationInvariant: true,
      note: 'objectData axes are preserved for the selected native direction; absolute editor coordinates are excluded'
    };
    inference.shadowValidation = buildShadowRegistrationDiagnostic(firstFacing, inference);
    if (inference.shadowValidation.available && inference.shadowValidation.confidence === 'high') inference.confidence = 'high-shadow-validated';
    return inference;
  }

  function rotateLocalPointForFacing(point, facing) {
    var x = num(point && point.x, 0), y = num(point && point.y, 0);
    facing = ((Math.round(num(facing, 0)) % 4) + 4) % 4;
    if (facing === 1) return { x: -y, y: x };
    if (facing === 2) return { x: -x, y: -y };
    if (facing === 3) return { x: y, y: -x };
    return { x: x, y: y };
  }

  function buildRelativeRegistrationModel(doc, footprintInference) {
    var registration = doc && doc.metadata && doc.metadata.registrationPx ? doc.metadata.registrationPx : { x: doc.width / 2, y: doc.height };
    var anchorCell = footprintInference && footprintInference.anchorCell ? footprintInference.anchorCell : { x: 0, y: 0, z: 0 };
    var localRegistration = footprintInference && footprintInference.localRegistration ? footprintInference.localRegistration : {
      x: num(anchorCell.x, 0) + 0.5,
      y: num(anchorCell.y, 0) + 0.5,
      z: num(anchorCell.z, 0)
    };
    // The editor and flat-sprite renderer already project prefab.anchor, which is
    // the Habbo position tile. Therefore the sprite offset must add only the
    // centre vector inside that tile. Adding anchorCell again double-counted the
    // position tile and produced whole-cell errors for multi-tile furniture.
    var registrationFromAnchorCorner = { x: 0.5, y: 0.5, z: 0 };
    var baseX = doc.width / 2 - num(registration.x, doc.width / 2);
    var baseY = doc.height - num(registration.y, doc.height);
    var transforms = [0, 1, 2, 3].map(function (facing) {
      var view = rotateLocalPointForFacing(registrationFromAnchorCorner, facing);
      return {
        facing: facing,
        scale: 1,
        offsetPx: {
          x: Math.round(baseX + (view.x - view.y) * 32),
          y: Math.round(baseY + (view.x + view.y) * 16)
        }
      };
    });
    return {
      version: 'habbo-position-tile-registration-v3-no-double-anchor',
      coordinateModel: 'direction-aware-position-tile-center',
      imageRegistrationPx: { x: num(registration.x, 0), y: num(registration.y, 0) },
      voxelRegistrationLocal: { x: num(localRegistration.x, 0), y: num(localRegistration.y, 0), z: num(localRegistration.z, 0) },
      registrationFromAnchorCorner: registrationFromAnchorCorner,
      anchorCell: {
        x: num(anchorCell.x, 0),
        y: num(anchorCell.y, 0),
        z: num(anchorCell.z, 0)
      },
      sourceDirection: footprintInference ? Number(footprintInference.sourceDirection) || 0 : 0,
      canonicalTile: { width: 64, height: 32 },
      transforms: transforms,
      shadowValidation: footprintInference && footprintInference.shadowValidation || null,
      note: 'prefab.anchor is projected separately; transforms contain only image-registration correction plus half-tile centre vector'
    };
  }

  function buildLayerModels(runtime, preferredSize, sourceDirection, mirrorX, stateId) {
    var meta = runtime.meta;
    var vis = Runtime.chooseHabboVisualization(meta, preferredSize);
    var layers = [];
    if (!vis) return layers;
    for (var layerId = 0; layerId <= vis.layerCount; layerId += 1) {
      var letter = Runtime.getHabboLayerLetter(layerId, vis.layerCount);
      var frame = Runtime.getHabboAnimationFrameForLayer(vis, layerId, stateId == null ? 0 : stateId);
      var asset = Runtime.chooseHabboAssetForLayer(meta, letter, sourceDirection, frame, vis.size || preferredSize);
      if (!asset) continue;
      var resolved = Runtime.resolveHabboLayerImage(runtime.bitmaps, asset);
      if (!resolved || !resolved.canvas || !resolved.width || !resolved.height) continue;
      // Habbo animated furniture commonly uses a 1×1 bitmap as an empty frame
      // placeholder. Importing it as a real layer creates a stray black pixel.
      if (Number(resolved.width) <= 1 && Number(resolved.height) <= 1 && letter !== 'sd') continue;
      var props = layerProps(vis, layerId, sourceDirection);
      var regX = num(asset.x, 0), regY = num(asset.y, 0);
      var width = Number(resolved.width || 0), height = Number(resolved.height || 0);
      var baseX = (asset.flipH ? (regX - width) : (-regX)) + num(props.x, 0);
      var baseY = (-regY) + num(props.y, 0);
      layers.push({
        layerId: layerId,
        letter: letter,
        kind: letter === 'sd' ? 'shadow' : (layerId === 0 ? 'body' : 'part'),
        asset: asset,
        image: resolved.canvas,
        width: width,
        height: height,
        x: baseX,
        y: baseY,
        flip: (!!asset.flipH !== !!mirrorX),
        opacity: props.alpha == null ? (letter === 'sd' ? 0.2 : 1) : clamp(num(props.alpha, 255) / 255, 0, 1),
        blendMode: String(props.ink || '').toUpperCase() === 'ADD' ? 'add' : 'normal',
        order: letter === 'sd' ? -10000 : layerId,
        sourceDirection: Number(sourceDirection) || 0,
        sourceStateId: Number(stateId) || 0,
        frameId: frame,
        mirrorX: !!mirrorX,
        visualZ: num(props.z, 0)
      });
    }
    layers.sort(function (a, b) {
      if (a.kind === 'shadow' && b.kind !== 'shadow') return -1;
      if (b.kind === 'shadow' && a.kind !== 'shadow') return 1;
      if (num(a.visualZ, 0) !== num(b.visualZ, 0)) return num(a.visualZ, 0) - num(b.visualZ, 0);
      if (a.order !== b.order) return a.order - b.order;
      return String(a.asset && a.asset.name || '').localeCompare(String(b.asset && b.asset.name || ''));
    });
    return applyGeneratedMirrorSpatialRule(layers, mirrorX);
  }

  function calculateSharedBounds(facingModels) {
    var minX = 0, minY = 0, maxX = 1, maxY = 1;
    facingModels.forEach(function (facing) {
      facing.layers.forEach(function (layer) {
        minX = Math.min(minX, Math.floor(layer.x));
        minY = Math.min(minY, Math.floor(layer.y));
        maxX = Math.max(maxX, Math.ceil(layer.x + layer.width));
        maxY = Math.max(maxY, Math.ceil(layer.y + layer.height));
      });
    });
    var padding = 2;
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
      width: Math.max(1, maxX - minX + padding * 2),
      height: Math.max(1, maxY - minY + padding * 2)
    };
  }

  function drawLayerSurfacePixels(layer) {
    // Keep every imported SWF layer on its own backing surface. The document is
    // only a viewport; it must never become the storage boundary for layer data.
    var width = Math.max(1, Math.round(Number(layer.width) || 1));
    var height = Math.max(1, Math.round(Number(layer.height) || 1));
    var canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    ctx.imageSmoothingEnabled = false;
    if (layer.flip) {
      ctx.save(); ctx.translate(width, 0); ctx.scale(-1, 1); ctx.drawImage(layer.image, 0, 0); ctx.restore();
    } else ctx.drawImage(layer.image, 0, 0);
    return new Uint8ClampedArray(ctx.getImageData(0, 0, width, height).data);
  }

  function collectPalette(doc, limit) {
    var counts = new Map();
    doc.facings.forEach(function (facing) {
      facing.layers.forEach(function (layer) {
        var pixels = layer.pixels;
        for (var i = 0; i < pixels.length; i += 4) {
          if (!pixels[i + 3]) continue;
          var key = pixels[i].toString(16).padStart(2,'0') + pixels[i+1].toString(16).padStart(2,'0') + pixels[i+2].toString(16).padStart(2,'0');
          counts.set(key, (counts.get(key) || 0) + 1);
        }
      });
    });
    doc.palette = Array.from(counts.entries()).sort(function (a,b) { return b[1]-a[1]; }).slice(0, limit || 64).map(function (entry) { return '#' + entry[0]; });
  }

  function pixelsToDataUrl(pixels, width, height) {
    var canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    var ctx = canvas.getContext('2d'); ctx.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
    return canvas.toDataURL('image/png');
  }

  function buildGenericArtwork(runtime, file, sourceHash, sourceStateId) {
    var meta = runtime.meta;
    var preferredSize = Runtime.chooseHabboPreferredVisualSize(meta) || 64;
    sourceStateId = Number.isFinite(Number(sourceStateId)) ? Number(sourceStateId) : 0;
    var dirs = sourceDirections(runtime, preferredSize);
    var plan = Runtime.buildHabboFacingPlan(dirs);
    var facingModels = [0,1,2,3].map(function (index) {
      var mapping = plan.directionMap[index] || plan.directionMap[0] || { sourceDirection: dirs[0] || 0, mirrorX: false };
      return {
        index: index,
        sourceDirection: Number(mapping.sourceDirection) || 0,
        mirrorX: !!mapping.mirrorX,
        layers: buildLayerModels(runtime, preferredSize, Number(mapping.sourceDirection) || 0, !!mapping.mirrorX, sourceStateId)
      };
    });
    var bounds = calculateSharedBounds(facingModels);
    if (bounds.width > 512 || bounds.height > 512) throw new Error('解析后的分层画布为 ' + bounds.width + '×' + bounds.height + '，超过当前 512×512 上限');
    var names = ['北 / N','东 / E','南 / S','西 / W'];
    var doc = core.createDocument(bounds.width, bounds.height, {
      metadata: {
        sourceType: 'habbo',
        registrationPx: { x: -bounds.minX, y: -bounds.minY },
        habboImport: {
          version: 'habbo-to-generic-artwork-v3-unbounded-layers-relative-registration',
          fileName: file.name,
          fileSize: file.size,
          sha256: sourceHash,
          type: String(meta.type || ''),
          preferredSize: preferredSize,
          sourceStateId: sourceStateId,
          sourceDirections: dirs,
          directionMap: facingModels.map(function (f) { return { facing: f.index, sourceDirection: f.sourceDirection, mirrorX: f.mirrorX }; }),
          dimensions: meta.dimensions || null,
          importedAt: new Date().toISOString()
        }
      }
    });
    doc.facings = facingModels.map(function (model, facingIndex) {
      var layers = model.layers.map(function (sourceLayer) {
        return core.createLayer(bounds.width, bounds.height, {
          name: sourceLayer.kind === 'shadow' ? '阴影 · ' + sourceLayer.letter : 'Habbo · ' + sourceLayer.letter,
          visible: true,
          locked: false,
          opacity: sourceLayer.opacity,
          blendMode: sourceLayer.blendMode,
          source: {
            kind: 'habbo-layer',
            assetName: sourceLayer.asset.name,
            letter: sourceLayer.letter,
            sourceDirection: sourceLayer.sourceDirection,
            sourceStateId: sourceLayer.sourceStateId,
            frameId: sourceLayer.frameId,
            mirrorX: sourceLayer.mirrorX,
            assetFlipH: !!sourceLayer.asset.flipH
          },
          metadata: {
            originalOffset: { x: sourceLayer.x, y: sourceLayer.y },
            documentSurfaceOrigin: {
              x: Math.round(sourceLayer.x - bounds.minX),
              y: Math.round(sourceLayer.y - bounds.minY)
            },
            generatedMirrorShiftX: Number(sourceLayer.generatedMirrorShiftX) || 0,
            spatialMirrorRule: sourceLayer.mirrorX ? 'assembled-body-bounds-v1' : 'native',
            visualZ: sourceLayer.visualZ,
            actorBand: sourceLayer.kind === 'shadow' ? 'back' : 'auto'
          },
          surface: {
            x: Math.round(sourceLayer.x - bounds.minX),
            y: Math.round(sourceLayer.y - bounds.minY),
            w: Math.max(1, Math.round(sourceLayer.width)),
            h: Math.max(1, Math.round(sourceLayer.height))
          },
          pixels: drawLayerSurfacePixels(sourceLayer)
        });
      });
      if (!layers.length) layers.push(core.createLayer(bounds.width, bounds.height, { name: '空白图层' }));
      return { id: facingIndex, name: names[facingIndex], layers: layers, activeLayerId: layers[layers.length - 1].id };
    });
    doc.activeFacing = 0;
    collectPalette(doc, 64);
    return { document: doc, preferredSize: preferredSize, facingModels: facingModels, sourceStateId: sourceStateId };
  }

  function buildVoxelSnapshot(footprintInference) {
    var voxels = [];
    (footprintInference.cells || []).forEach(function (cell) {
      for (var z = 0; z < footprintInference.h; z += 1) voxels.push({ x: cell.x, y: cell.y, z: z, solid: true, collidable: true });
    });
    return {
      anchor: { x: num(footprintInference.anchorCell && footprintInference.anchorCell.x, 0), y: num(footprintInference.anchorCell && footprintInference.anchorCell.y, 0), z: num(footprintInference.anchorCell && footprintInference.anchorCell.z, 0) },
      voxels: voxels,
      bounds: { w: footprintInference.w, d: footprintInference.d, h: footprintInference.h },
      grid: { w: Math.max(4, footprintInference.w + 3), h: Math.max(4, footprintInference.d + 3) },
      currentLayer: 0,
      sourceType: 'habbo'
    };
  }

  function buildSpriteState(relativeRegistration) {
    return {
      activeFacing: 0,
      previewOpacity: 1,
      facingTransforms: relativeRegistration.transforms.map(function (transform, facing) {
        return { facing: facing, sourceFacing: facing, flipX: false, flipY: false, scale: transform.scale || 1, offsetPx: { x: transform.offsetPx.x, y: transform.offsetPx.y } };
      })
    };
  }

  function buildGenericArtworkStates(runtime, file, sourceHash) {
    var preferredSize = Runtime.chooseHabboPreferredVisualSize(runtime.meta) || 64;
    var stateIds = typeof Runtime.getHabboVisualizationStates === 'function' ? Runtime.getHabboVisualizationStates(runtime.meta, preferredSize) : [0];
    var activeSourceState = typeof Runtime.getHabboVisualizationState === 'function' ? Runtime.getHabboVisualizationState(runtime.meta, runtime.bitmaps, preferredSize) : stateIds[0];
    var results = stateIds.map(function (stateId) { return buildGenericArtwork(runtime, file, sourceHash, stateId); });
    return { stateIds: stateIds, activeSourceState: activeSourceState, results: results };
  }

  async function importSwf(file) {
    if (!file) return;
    var input = byId('habboSwfFile');
    setStatus('正在解析 Habbo SWF…');
    try {
      var buffer = await file.arrayBuffer();
      var sourceHash = await hashBytes(buffer);
      var runtime = await Runtime.parseHabboSwfRuntime(buffer);
      var multi = buildGenericArtworkStates(runtime, file, sourceHash);
      var activeIndex = Math.max(0, multi.stateIds.indexOf(multi.activeSourceState));
      var result = multi.results[activeIndex] || multi.results[0];
      var doc = result.document;
      var meta = runtime.meta;
      var footprintInference = inferHabboFootprint(meta, result.facingModels);
      var width = footprintInference.w;
      var depth = footprintInference.d;
      var height = footprintInference.h;
      var registration = doc.metadata.registrationPx;
      var relativeRegistration = buildRelativeRegistrationModel(doc, footprintInference);
      var initialPixels = core.compositeFacing(doc, 0);
      var initialTransform = relativeRegistration.transforms[0];
      Editor.applyImportedHabboAsset({
        id: 'habbo_' + safeName(meta.type || file.name),
        name: String(meta.type || file.name.replace(/\.swf$/i,'')),
        kind: 'habbo',
        fileName: file.name,
        dataUrl: pixelsToDataUrl(initialPixels, doc.width, doc.height),
        spriteFileName: safeName(meta.type || 'habbo') + '-facing-0.png',
        spriteScale: 1,
        offsetX: initialTransform.offsetPx.x,
        offsetY: initialTransform.offsetPx.y,
        facingTransforms: relativeRegistration.transforms,
        footprint: { w: width, d: depth, h: height, cells: footprintInference.cells },
        prefabAnchor: footprintInference.anchorCell,
        calibration: {
          version: 'generic-artwork-import-v4-position-tile-registration',
          registrationPx: registration,
          directionMap: doc.metadata.habboImport.directionMap,
          sourceStates: multi.stateIds,
          selectedInitialState: multi.activeSourceState,
          spatialMirrorRule: 'assembled-body-bounds-v1',
          footprintInference: footprintInference,
          relativeRegistration: relativeRegistration,
          layerEditingOwner: 'unified-pixel-art-editor'
        },
        importMetadata: {
          sourceType: 'habbo-swf', fileName: file.name, fileSize: file.size, sha256: sourceHash,
          habboType: meta.type || '', preferredSize: result.preferredSize, importedAt: new Date().toISOString()
        }
      });
      var imageEditor = global.__HZH_PIXEL_ART_EDITOR__;
      if (!imageEditor || !imageEditor.controller || typeof imageEditor.replaceMaterialStates !== 'function') throw new Error('通用图片状态编辑器尚未初始化');
      // Compatibility handoff for tools that still observe the active four-facing document.
      // The full state bundle below remains the canonical path.
      if (typeof imageEditor.controller.setDocument === 'function') imageEditor.controller.setDocument(doc, 'habbo-import-active-state');
      var statePayloads = multi.results.map(function (stateResult) {
        var stateFootprint = inferHabboFootprint(meta, stateResult.facingModels);
        var stateRegistration = buildRelativeRegistrationModel(stateResult.document, stateFootprint);
        return {
          id: 'habbo_state_' + String(stateResult.sourceStateId),
          name: '状态 ' + String(stateResult.sourceStateId),
          artwork: core.serializeDocument(stateResult.document),
          voxel: buildVoxelSnapshot(stateFootprint),
          sprite: buildSpriteState(stateRegistration),
          metadata: {
            sourceType: 'habbo-swf',
            sourceStateId: stateResult.sourceStateId,
            fileName: file.name,
            sha256: sourceHash,
            importedAt: new Date().toISOString()
          }
        };
      });
      var activeStateId = 'habbo_state_' + String(multi.activeSourceState);
      imageEditor.replaceMaterialStates(statePayloads, activeStateId, 'habbo-multi-state-import');
      imageEditor.fitView();
      imageEditor.syncToPrefab();
      setStatus('Habbo 已导入 ' + statePayloads.length + ' 个状态；每个状态包含四方向图片与独立体素');
      detail('file=' + file.name + ' type=' + (meta.type || '') + ' states=' + multi.stateIds.join(',') + ' activeState=' + multi.activeSourceState + ' canvas=' + doc.width + 'x' + doc.height + ' footprintRule=' + footprintInference.rule + ' footprint=' + width + 'x' + depth);
    } catch (error) {
      console.error(error);
      setStatus('Habbo 导入失败：' + (error.message || error), false);
    } finally {
      if (input) input.value = '';
    }
  }

  function bind() {
    var button = byId('importHabboSwf');
    var input = byId('habboSwfFile');
    if (!button || !input) return;
    button.addEventListener('click', function () { input.click(); });
    input.addEventListener('change', function () { importSwf(input.files && input.files[0]); });
    global.__HZH_HABBO_GENERIC_IMPORT__ = { version: 'HABBO-GENERIC-IMPORT-V5-MULTI-STATE', importSwf: importSwf, buildGenericArtwork: buildGenericArtwork, buildGenericArtworkStates: buildGenericArtworkStates, inferHabboFootprint: inferHabboFootprint, buildRelativeRegistrationModel: buildRelativeRegistrationModel, applyGeneratedMirrorSpatialRule: applyGeneratedMirrorSpatialRule };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})(typeof window !== 'undefined' ? window : globalThis);
