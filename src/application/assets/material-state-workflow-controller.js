(function (global) {
  'use strict';

  var core = global.__HZH_MATERIAL_STATE_CORE__;
  if (!core) throw new Error('material-state-core.js must load before material-state-workflow-controller.js');

  var VERSION = 'HZH-MATERIAL-STATE-WORKFLOW-V1';

  function createController(options) {
    options = options || {};
    var adapters = options.adapters || {};
    var bundle = core.createBundle(options.initial || {});
    var listeners = [];
    var clipboard = null;
    var applying = false;

    function emit(type, detail) {
      var event = { type: type, detail: detail || {}, bundle: bundle, activeState: core.getActiveState(bundle) };
      listeners.slice().forEach(function (listener) { try { listener(event); } catch (_) {} });
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return function () {};
      listeners.push(listener);
      return function () { var index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1); };
    }

    function captureActive() {
      if (applying) return core.getActiveState(bundle);
      var state = core.getActiveState(bundle);
      if (!state) return null;
      var patch = {};
      if (typeof adapters.captureArtwork === 'function') patch.artwork = adapters.captureArtwork();
      if (typeof adapters.captureVoxel === 'function') patch.voxel = adapters.captureVoxel();
      if (typeof adapters.captureSprite === 'function') patch.sprite = adapters.captureSprite();
      core.updateState(bundle, state.id, patch);
      if (typeof adapters.onBundleChanged === 'function') adapters.onBundleChanged(bundle);
      return state;
    }

    function applyState(state, reason) {
      if (!state) return false;
      applying = true;
      try {
        if (typeof adapters.applyArtwork === 'function') adapters.applyArtwork(core.clone(state.artwork), reason || 'state-switch');
        if (typeof adapters.applyVoxel === 'function') adapters.applyVoxel(core.clone(state.voxel), reason || 'state-switch');
        if (typeof adapters.applySprite === 'function') adapters.applySprite(core.clone(state.sprite), reason || 'state-switch');
        if (typeof adapters.afterApply === 'function') adapters.afterApply(state, reason || 'state-switch');
      } finally {
        applying = false;
      }
      emit('state-applied', { stateId: state.id, reason: reason || 'state-switch' });
      return true;
    }

    function initialize(nextBundle, reason) {
      bundle = core.normalizeBundle(nextBundle, options.initial || {});
      var state = core.getActiveState(bundle);
      applyState(state, reason || 'initialize');
      emit('bundle-replaced', { reason: reason || 'initialize' });
      return state;
    }

    function switchState(stateId, reason) {
      if (String(bundle.activeStateId) === String(stateId)) return core.getActiveState(bundle);
      captureActive();
      var state = core.setActiveState(bundle, stateId);
      if (!state) return false;
      applyState(state, reason || 'switch');
      if (typeof adapters.onBundleChanged === 'function') adapters.onBundleChanged(bundle);
      return state;
    }

    function addState(options2) {
      captureActive();
      var state = core.addState(bundle, options2 || { blankArtwork: true });
      applyState(state, 'add-state');
      emit('states-changed', { action: 'add', stateId: state.id });
      return state;
    }

    function duplicateState(name) {
      captureActive();
      var state = core.duplicateState(bundle, bundle.activeStateId, name);
      if (!state) return false;
      applyState(state, 'duplicate-state');
      emit('states-changed', { action: 'duplicate', stateId: state.id });
      return state;
    }

    function deleteState(stateId) {
      captureActive();
      var removed = core.deleteState(bundle, stateId || bundle.activeStateId);
      if (!removed) return false;
      var state = core.getActiveState(bundle);
      applyState(state, 'delete-state');
      emit('states-changed', { action: 'delete', stateId: removed.id });
      return removed;
    }

    function renameState(stateId, name) {
      var state = core.renameState(bundle, stateId || bundle.activeStateId, name);
      if (state) emit('states-changed', { action: 'rename', stateId: state.id });
      return state;
    }

    function moveState(delta) {
      var state = core.moveState(bundle, bundle.activeStateId, delta);
      if (state) emit('states-changed', { action: 'move', stateId: state.id });
      return state;
    }

    function copyActiveLayer(layerId, facing) {
      captureActive();
      var active = core.getActiveState(bundle);
      var payload = core.copyLayerPayload(active && active.artwork, facing, layerId);
      if (!payload) return false;
      clipboard = { kind: 'layer', payload: payload, sourceStateId: active.id, sourceFacing: facing };
      emit('clipboard', { kind: 'layer' });
      return true;
    }

    function pasteLayer(targetStateId, targetFacing) {
      if (!clipboard || clipboard.kind !== 'layer') return false;
      captureActive();
      var result = core.pasteLayerPayload(bundle, targetStateId || bundle.activeStateId, targetFacing, clipboard.payload);
      if (!result) return false;
      if (String(targetStateId || bundle.activeStateId) === String(bundle.activeStateId)) applyState(core.getActiveState(bundle), 'paste-layer');
      emit('states-changed', { action: 'paste-layer', stateId: targetStateId || bundle.activeStateId, facing: targetFacing });
      return result;
    }

    function copyFacingToState(targetStateId, targetFacing, sourceFacing) {
      captureActive();
      var result = core.copyFacing(bundle, bundle.activeStateId, sourceFacing, targetStateId, targetFacing);
      if (!result) return false;
      if (String(targetStateId) === String(bundle.activeStateId)) applyState(core.getActiveState(bundle), 'copy-facing');
      emit('states-changed', { action: 'copy-facing', stateId: targetStateId, facing: targetFacing });
      return true;
    }

    function replaceStates(states, activeStateId, reason) {
      captureActive();
      return initialize({ version: core.VERSION, activeStateId: activeStateId, states: states }, reason || 'replace-states');
    }

    function exportBundle() {
      captureActive();
      return core.normalizeBundle(core.clone(bundle), options.initial || {});
    }

    return {
      VERSION: VERSION,
      subscribe: subscribe,
      getBundle: function () { return bundle; },
      getActiveState: function () { return core.getActiveState(bundle); },
      isApplying: function () { return applying; },
      captureActive: captureActive,
      initialize: initialize,
      switchState: switchState,
      addState: addState,
      duplicateState: duplicateState,
      deleteState: deleteState,
      renameState: renameState,
      moveState: moveState,
      copyActiveLayer: copyActiveLayer,
      pasteLayer: pasteLayer,
      copyFacingToState: copyFacingToState,
      replaceStates: replaceStates,
      exportBundle: exportBundle,
      getClipboard: function () { return clipboard; }
    };
  }

  var api = { VERSION: VERSION, createController: createController };
  global.__HZH_MATERIAL_STATE_WORKFLOW__ = api;
  if (global.__APP_NAMESPACE && typeof global.__APP_NAMESPACE.bind === 'function') {
    global.__APP_NAMESPACE.bind('application.materialStateWorkflow', api, { owner: 'src/application/assets/material-state-workflow-controller.js', phase: 'asset-editor-state-v1' });
  }
})(typeof window !== 'undefined' ? window : globalThis);
