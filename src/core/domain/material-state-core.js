(function (global) {
  'use strict';

  var pixelCore = global.__HZH_PIXEL_ART_CORE__;
  if (!pixelCore) throw new Error('pixel-art-core.js must load before material-state-core.js');

  var VERSION = 'HZH-MATERIAL-STATE-BUNDLE-V1';
  var counter = 0;

  function clone(value) {
    if (value == null) return value;
    return JSON.parse(JSON.stringify(value));
  }

  function makeId(prefix) {
    counter += 1;
    return String(prefix || 'state') + '_' + Date.now().toString(36) + '_' + counter.toString(36);
  }

  function normalizeVoxel(snapshot) {
    snapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
    var voxels = Array.isArray(snapshot.voxels) ? snapshot.voxels.map(function (v) {
      return {
        x: Math.round(Number(v && v.x) || 0),
        y: Math.round(Number(v && v.y) || 0),
        z: Math.round(Number(v && v.z) || 0),
        solid: !v || v.solid !== false,
        collidable: !v || v.collidable !== false
      };
    }) : [];
    voxels.sort(function (a, b) { return a.z - b.z || a.y - b.y || a.x - b.x; });
    var maxX = voxels.length ? Math.max.apply(Math, voxels.map(function (v) { return v.x; })) : 0;
    var maxY = voxels.length ? Math.max.apply(Math, voxels.map(function (v) { return v.y; })) : 0;
    var maxZ = voxels.length ? Math.max.apply(Math, voxels.map(function (v) { return v.z; })) : 0;
    return {
      anchor: {
        x: Number(snapshot.anchor && snapshot.anchor.x) || 0,
        y: Number(snapshot.anchor && snapshot.anchor.y) || 0,
        z: Number(snapshot.anchor && snapshot.anchor.z) || 0
      },
      voxels: voxels,
      bounds: clone(snapshot.bounds) || { w: maxX + 1, d: maxY + 1, h: maxZ + 1 },
      grid: {
        w: Math.max(4, Math.min(64, Math.round(Number(snapshot.grid && snapshot.grid.w) || maxX + 3 || 10))),
        h: Math.max(4, Math.min(64, Math.round(Number(snapshot.grid && snapshot.grid.h) || maxY + 3 || 10)))
      },
      currentLayer: Math.max(0, Math.round(Number(snapshot.currentLayer) || 0)),
      sourceType: String(snapshot.sourceType || 'blank')
    };
  }

  function normalizeSprite(snapshot) {
    snapshot = snapshot && typeof snapshot === 'object' ? snapshot : {};
    var transforms = Array.isArray(snapshot.facingTransforms) ? snapshot.facingTransforms : [];
    return {
      activeFacing: Math.max(0, Math.min(3, Math.round(Number(snapshot.activeFacing) || 0))),
      previewOpacity: Math.max(0.05, Math.min(1, Number(snapshot.previewOpacity) || 1)),
      facingTransforms: [0, 1, 2, 3].map(function (facing) {
        var item = transforms[facing] || {};
        return {
          facing: facing,
          sourceFacing: Math.max(0, Math.min(3, Math.round(Number(item.sourceFacing == null ? facing : item.sourceFacing) || 0))),
          flipX: !!item.flipX,
          flipY: !!item.flipY,
          scale: Math.max(0.05, Number(item.scale) || 1),
          offsetPx: {
            x: Number(item.offsetX != null ? item.offsetX : item.offsetPx && item.offsetPx.x) || 0,
            y: Number(item.offsetY != null ? item.offsetY : item.offsetPx && item.offsetPx.y) || 0
          }
        };
      })
    };
  }

  function blankArtworkLike(serialized) {
    var width = Math.max(1, Math.min(512, Math.round(Number(serialized && serialized.width) || 32)));
    var height = Math.max(1, Math.min(512, Math.round(Number(serialized && serialized.height) || 32)));
    var metadata = clone(serialized && serialized.metadata) || {};
    metadata.sourceType = 'state-blank';
    metadata.createdAt = new Date().toISOString();
    metadata.updatedAt = metadata.createdAt;
    return pixelCore.serializeDocument(pixelCore.createDocument(width, height, { palette: serialized && serialized.palette, metadata: metadata }));
  }

  function normalizeState(raw, index, fallback) {
    raw = raw && typeof raw === 'object' ? raw : {};
    fallback = fallback || {};
    var artwork = raw.artwork || raw.document || fallback.artwork || pixelCore.serializeDocument(pixelCore.createDocument(32, 32));
    return {
      id: String(raw.id || makeId('state')),
      name: String(raw.name || ('状态 ' + index)),
      artwork: clone(artwork),
      voxel: normalizeVoxel(raw.voxel || fallback.voxel),
      sprite: normalizeSprite(raw.sprite || fallback.sprite),
      metadata: Object.assign({}, clone(fallback.metadata) || {}, clone(raw.metadata) || {})
    };
  }

  function createBundle(options) {
    options = options || {};
    var state = normalizeState({
      id: options.id || 'state_0',
      name: options.name || '状态 0',
      artwork: options.artwork,
      voxel: options.voxel,
      sprite: options.sprite,
      metadata: options.metadata
    }, 0);
    return {
      version: VERSION,
      activeStateId: state.id,
      states: [state],
      metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    };
  }

  function normalizeBundle(raw, fallback) {
    raw = raw && typeof raw === 'object' ? raw : {};
    fallback = fallback || {};
    var rawStates = Array.isArray(raw.states) ? raw.states : [];
    if (!rawStates.length && Array.isArray(raw.artworkStates)) rawStates = raw.artworkStates;
    if (!rawStates.length) return createBundle(fallback);
    var states = rawStates.map(function (state, index) { return normalizeState(state, index, fallback); });
    var activeStateId = String(raw.activeStateId || raw.activeId || states[0].id);
    if (!states.some(function (state) { return state.id === activeStateId; })) activeStateId = states[0].id;
    return {
      version: VERSION,
      activeStateId: activeStateId,
      states: states,
      metadata: Object.assign({ updatedAt: new Date().toISOString() }, clone(raw.metadata) || {})
    };
  }

  function getState(bundle, stateId) {
    if (!bundle || !Array.isArray(bundle.states)) return null;
    var id = String(stateId || bundle.activeStateId || '');
    return bundle.states.find(function (state) { return String(state.id) === id; }) || null;
  }

  function getActiveState(bundle) { return getState(bundle, bundle && bundle.activeStateId); }

  function touch(bundle) {
    bundle.metadata = bundle.metadata || {};
    bundle.metadata.updatedAt = new Date().toISOString();
    return bundle;
  }

  function setActiveState(bundle, stateId) {
    var state = getState(bundle, stateId);
    if (!state) return false;
    bundle.activeStateId = state.id;
    touch(bundle);
    return state;
  }

  function updateState(bundle, stateId, patch) {
    var state = getState(bundle, stateId);
    if (!state) return false;
    patch = patch || {};
    if (patch.artwork) state.artwork = clone(patch.artwork);
    if (patch.voxel) state.voxel = normalizeVoxel(patch.voxel);
    if (patch.sprite) state.sprite = normalizeSprite(patch.sprite);
    if (patch.metadata) state.metadata = Object.assign({}, state.metadata || {}, clone(patch.metadata));
    if (patch.name != null) state.name = String(patch.name || state.name);
    touch(bundle);
    return state;
  }

  function addState(bundle, options) {
    options = options || {};
    var active = getActiveState(bundle);
    var fallback = active || {};
    var raw = {
      id: options.id || makeId('state'),
      name: options.name || ('状态 ' + bundle.states.length),
      artwork: options.blankArtwork ? blankArtworkLike(fallback.artwork) : (options.artwork || fallback.artwork),
      voxel: options.voxel || fallback.voxel,
      sprite: options.sprite || fallback.sprite,
      metadata: Object.assign({}, clone(fallback.metadata) || {}, clone(options.metadata) || {})
    };
    var state = normalizeState(raw, bundle.states.length, fallback);
    bundle.states.push(state);
    bundle.activeStateId = state.id;
    touch(bundle);
    return state;
  }

  function duplicateState(bundle, stateId, name) {
    var source = getState(bundle, stateId) || getActiveState(bundle);
    if (!source) return false;
    return addState(bundle, {
      name: String(name || (source.name + ' 副本')),
      artwork: source.artwork,
      voxel: source.voxel,
      sprite: source.sprite,
      metadata: Object.assign({}, clone(source.metadata) || {}, { duplicatedFrom: source.id, duplicatedAt: new Date().toISOString() })
    });
  }

  function deleteState(bundle, stateId) {
    if (!bundle || !Array.isArray(bundle.states) || bundle.states.length <= 1) return false;
    var index = bundle.states.findIndex(function (state) { return state.id === String(stateId); });
    if (index < 0) return false;
    var removed = bundle.states.splice(index, 1)[0];
    if (bundle.activeStateId === removed.id) bundle.activeStateId = bundle.states[Math.max(0, index - 1)].id;
    touch(bundle);
    return removed;
  }

  function renameState(bundle, stateId, name) {
    var state = getState(bundle, stateId);
    var next = String(name || '').trim();
    if (!state || !next || state.name === next) return false;
    state.name = next;
    touch(bundle);
    return state;
  }

  function moveState(bundle, stateId, delta) {
    var index = bundle.states.findIndex(function (state) { return state.id === String(stateId); });
    if (index < 0) return false;
    var next = Math.max(0, Math.min(bundle.states.length - 1, index + (delta < 0 ? -1 : 1)));
    if (next === index) return false;
    var state = bundle.states.splice(index, 1)[0];
    bundle.states.splice(next, 0, state);
    touch(bundle);
    return state;
  }

  function copyLayerPayload(artwork, facingIndex, layerId) {
    var doc = pixelCore.deserializeDocument(artwork);
    var facing = pixelCore.getFacing(doc, facingIndex);
    if (!facing) return null;
    var layer = facing.layers.find(function (item) { return item.id === String(layerId); }) || facing.layers[0];
    if (!layer) return null;
    var serialized = pixelCore.serializeDocument(doc);
    var serializedFacing = serialized.facings[Math.max(0, Math.min(3, Number(facingIndex) || 0))];
    var serializedLayer = serializedFacing.layers.find(function (item) { return item.id === layer.id; });
    return serializedLayer ? clone(serializedLayer) : null;
  }

  function pasteLayerPayload(bundle, stateId, facingIndex, layerPayload) {
    var state = getState(bundle, stateId);
    if (!state || !layerPayload) return false;
    var serialized = clone(state.artwork);
    var targetFacing = serialized.facings[Math.max(0, Math.min(3, Math.round(Number(facingIndex) || 0)))];
    if (!targetFacing) return false;
    var layer = clone(layerPayload);
    layer.id = pixelCore.makeId('layer');
    layer.name = String(layer.name || '图层') + ' 副本';
    targetFacing.layers.push(layer);
    targetFacing.activeLayerId = layer.id;
    state.artwork = serialized;
    touch(bundle);
    return layer;
  }

  function copyFacing(bundle, sourceStateId, sourceFacing, targetStateId, targetFacing) {
    var source = getState(bundle, sourceStateId);
    var target = getState(bundle, targetStateId);
    if (!source || !target) return false;
    var sourceArtwork = clone(source.artwork);
    var targetArtwork = clone(target.artwork);
    var from = sourceArtwork.facings[Math.max(0, Math.min(3, Math.round(Number(sourceFacing) || 0)))];
    var index = Math.max(0, Math.min(3, Math.round(Number(targetFacing) || 0)));
    if (!from || !targetArtwork.facings[index]) return false;
    var copied = clone(from);
    copied.id = index;
    copied.layers.forEach(function (layer) { layer.id = pixelCore.makeId('layer'); });
    copied.activeLayerId = copied.layers[0] ? copied.layers[0].id : '';
    targetArtwork.facings[index] = copied;
    target.artwork = targetArtwork;
    touch(bundle);
    return true;
  }

  function fromPackage(pkg, fallback) {
    pkg = pkg || {};
    if (pkg.materialStates) return normalizeBundle(pkg.materialStates, fallback);
    var artworkBundle = pkg.artworkStateBundle;
    var voxelBundle = pkg.voxelStateBundle;
    if (artworkBundle && Array.isArray(artworkBundle.states)) {
      var voxelsById = {};
      if (voxelBundle && Array.isArray(voxelBundle.states)) voxelBundle.states.forEach(function (entry) { voxelsById[String(entry.id)] = entry.voxel || entry; });
      return normalizeBundle({
        activeStateId: artworkBundle.activeStateId,
        states: artworkBundle.states.map(function (entry, index) {
          return {
            id: entry.id,
            name: entry.name,
            artwork: entry.artwork || entry.document,
            voxel: voxelsById[String(entry.id)] || fallback && fallback.voxel,
            sprite: entry.sprite,
            metadata: entry.metadata
          };
        })
      }, fallback);
    }
    if (pkg.prefab && pkg.prefab.materialStates) return normalizeBundle(pkg.prefab.materialStates, fallback);
    return createBundle(Object.assign({}, fallback || {}, { artwork: pkg.artwork || fallback && fallback.artwork, voxel: pkg.voxel || fallback && fallback.voxel }));
  }

  function compatibilityBundles(bundle) {
    var normalized = normalizeBundle(bundle);
    return {
      materialStates: clone(normalized),
      artworkStateBundle: {
        version: 'HZH-ARTWORK-STATE-BUNDLE-V1',
        activeStateId: normalized.activeStateId,
        states: normalized.states.map(function (state) { return { id: state.id, name: state.name, artwork: clone(state.artwork), sprite: clone(state.sprite), metadata: clone(state.metadata) }; })
      },
      voxelStateBundle: {
        version: 'HZH-VOXEL-STATE-BUNDLE-V1',
        activeStateId: normalized.activeStateId,
        states: normalized.states.map(function (state) { return { id: state.id, name: state.name, voxel: clone(state.voxel), metadata: clone(state.metadata) }; })
      }
    };
  }

  var api = {
    VERSION: VERSION,
    clone: clone,
    createBundle: createBundle,
    normalizeBundle: normalizeBundle,
    getState: getState,
    getActiveState: getActiveState,
    setActiveState: setActiveState,
    updateState: updateState,
    addState: addState,
    duplicateState: duplicateState,
    deleteState: deleteState,
    renameState: renameState,
    moveState: moveState,
    blankArtworkLike: blankArtworkLike,
    normalizeVoxel: normalizeVoxel,
    normalizeSprite: normalizeSprite,
    copyLayerPayload: copyLayerPayload,
    pasteLayerPayload: pasteLayerPayload,
    copyFacing: copyFacing,
    fromPackage: fromPackage,
    compatibilityBundles: compatibilityBundles
  };

  global.__HZH_MATERIAL_STATE_CORE__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('core.materialStates', api, { owner: 'src/core/domain/material-state-core.js', phase: 'asset-editor-state-v1' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
