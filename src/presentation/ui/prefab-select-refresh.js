// P11d-5: Prefab select refresh presentation owner.
// Owns DOM option refresh for the prefab select control.
(function installPrefabSelectRefresh(global) {
  'use strict';

  var OWNER = 'src/presentation/ui/prefab-select-refresh.js';

  var prefabSelectRefreshSeq = 0;
  var prefabSelectRefreshGuard = {
    active: false,
    activeRequestId: 0,
    activeSource: '',
    lastSignature: '',
    lastSkipSignature: '',
    sameSignatureSkipCount: 0,
    lastSkipLogAt: 0,
    reentrantBlockCount: 0,
    lastSelectedPrefabId: '',
  };
  var prefabSelectRefreshRequestStats = {
    lastBucketKey: '',
    bucketCount: 0,
    firstRequestId: 0,
    firstAt: 0,
    lastAt: 0,
  };

  function depsOrEmpty(deps) { return deps || {}; }
  function log(deps, message) {
    if (typeof deps.pushLog === 'function') deps.pushLog(message);
  }
  function getPrototypes(deps) {
    return (typeof deps.getPrototypes === 'function' && Array.isArray(deps.getPrototypes())) ? deps.getPrototypes() : [];
  }
  function clampValue(deps, value, min, max) {
    if (typeof deps.clamp === 'function') return deps.clamp(value, min, max);
    return Math.max(min, Math.min(max, value));
  }
  function normalizedCountText(count, deps) {
    var n = Number(count);
    if (!Number.isFinite(n) || n < 0) {
      log(depsOrEmpty(deps), '[prefab-select] normalized-count-invalid raw=' + JSON.stringify(count));
      return '0';
    }
    return String(Math.floor(n));
  }
  function logPrefabSelectRequest(source, requestId, state, deps) {
    deps = depsOrEmpty(deps);
    var now = Date.now();
    var bucketKey = String(source || 'unknown') + '||' + String(state && state.signature || '');
    var stats = prefabSelectRefreshRequestStats;
    if (stats.lastBucketKey === bucketKey && (now - stats.lastAt) < 400) {
      stats.bucketCount += 1;
      stats.lastAt = now;
      if (stats.bucketCount === 5 || stats.bucketCount === 20 || stats.bucketCount % 50 === 0) {
        log(deps, '[prefab-select] refresh-request-burst requestId=' + requestId
          + ' source=' + JSON.stringify(String(source || 'unknown'))
          + ' signature=' + JSON.stringify(state && state.signature || '')
          + ' burstCount=' + stats.bucketCount
          + ' firstRequestId=' + stats.firstRequestId
          + ' windowMs=' + (stats.lastAt - stats.firstAt)
          + ' selectedIndex=' + (state && typeof state.selectedIndex === 'number' ? state.selectedIndex : -1)
          + ' selectedPrefabId=' + JSON.stringify(state && state.selectedPrefabId || ''));
      }
      return;
    }
    stats.lastBucketKey = bucketKey;
    stats.bucketCount = 1;
    stats.firstRequestId = requestId;
    stats.firstAt = now;
    stats.lastAt = now;
    log(deps, '[prefab-select] refresh-request requestId=' + requestId
      + ' source=' + JSON.stringify(String(source || 'unknown'))
      + ' prototypeCount=' + (state && state.prototypeCount || 0)
      + ' selectedIndex=' + (state && typeof state.selectedIndex === 'number' ? state.selectedIndex : -1)
      + ' selectedPrefabId=' + JSON.stringify(state && state.selectedPrefabId || '')
      + ' signature=' + JSON.stringify(state && state.signature || ''));
  }
  function getPrefabSelectRefreshSource(explicitSource) {
    if (explicitSource) return String(explicitSource);
    try {
      var stack = String((new Error()).stack || '');
      var lines = stack.split(/\n+/).slice(1).map(function (line) { return String(line || '').trim(); }).filter(Boolean);
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.indexOf('refreshPrefabSelectOptions') >= 0) continue;
        if (line.indexOf('requestPrefabSelectRefresh') >= 0) continue;
        if (line.indexOf('prefab-select-refresh.js') >= 0) continue;
        if (line.indexOf('asset-management.js') >= 0) return line;
        return line;
      }
    } catch (_) {}
    return 'unknown';
  }
  function computePrefabSelectSignature(selectedIndex, deps) {
    deps = depsOrEmpty(deps);
    var prototypes = getPrototypes(deps);
    var safeIndex = clampValue(deps, Number(selectedIndex) || 0, 0, Math.max(0, prototypes.length - 1));
    var selectedPrefab = prototypes[safeIndex] || null;
    var selectedPrefabId = selectedPrefab ? String(selectedPrefab.id || '') : '';
    return {
      selectedIndex: safeIndex,
      selectedPrefabId: selectedPrefabId,
      prototypeCount: prototypes.length,
      optionCount: prototypes.length,
      signature: [prototypes.length, prototypes.length, selectedPrefabId].join('|')
    };
  }
  function logPrefabSelectSkip(kind, requestId, source, extra, deps) {
    deps = depsOrEmpty(deps);
    var now = Date.now();
    if (kind === 'same-signature') {
      prefabSelectRefreshGuard.sameSignatureSkipCount += 1;
      prefabSelectRefreshGuard.lastSkipSignature = extra && extra.signature ? extra.signature : prefabSelectRefreshGuard.lastSkipSignature;
      if (prefabSelectRefreshGuard.sameSignatureSkipCount > 1 && now - prefabSelectRefreshGuard.lastSkipLogAt < 1000) return;
      prefabSelectRefreshGuard.lastSkipLogAt = now;
    }
    log(deps, '[prefab-select] refresh-skip requestId=' + requestId
      + ' kind=' + kind
      + ' source=' + JSON.stringify(String(source || 'unknown'))
      + (extra && extra.signature ? ' signature=' + JSON.stringify(extra.signature) : '')
      + (extra && typeof extra.count === 'number' ? ' count=' + extra.count : '')
      + (extra && extra.activeRequestId ? ' activeRequestId=' + extra.activeRequestId : '')
      + (extra && extra.activeSource ? ' activeSource=' + JSON.stringify(extra.activeSource) : '')
      + (extra && typeof extra.selectedIndex === 'number' ? ' selectedIndex=' + extra.selectedIndex : '')
      + (extra && typeof extra.optionCount === 'number' ? ' optionCount=' + extra.optionCount : '')
      + (extra && extra.selectedPrefabId ? ' selectedPrefabId=' + JSON.stringify(extra.selectedPrefabId) : ''));
  }
  function buildPrefabSelectText(prefab, variant, idx, requestId, deps) {
    deps = depsOrEmpty(deps);
    var prefabId = String((prefab && prefab.id) || 'unknown');
    var variantVoxels = (variant && Array.isArray(variant.voxels)) ? variant.voxels.length : 0;
    var variantDims = variant ? (String(variant.w) + '×' + String(variant.d) + '×' + String(variant.h)) : 'unknown';
    try {
      var voxelInfo = prefab && prefab.proxyFallbackUsed
        ? ('源代理=0，运行时回退=' + normalizedCountText(variantVoxels, deps))
        : ('代理=' + normalizedCountText(variantVoxels, deps));
      return (prefab.key ? prefab.key + '. ' : '')
        + prefab.name
        + (prefab.custom ? ' [自定义]' : prefab.assetManaged ? ' [assets]' : '')
        + (prefab.sprite && prefab.sprite.image ? ' [sprite]' : '')
        + ' (' + variantDims + ' · ' + voxelInfo + ')';
    } catch (err) {
      log(deps, '[prefab-select] option-build-error requestId=' + requestId
        + ' idx=' + idx
        + ' prefabId=' + JSON.stringify(prefabId)
        + ' name=' + JSON.stringify(prefab && prefab.name || '')
        + ' custom=' + (!!(prefab && prefab.custom))
        + ' assetManaged=' + (!!(prefab && prefab.assetManaged))
        + ' proxyFallbackUsed=' + (!!(prefab && prefab.proxyFallbackUsed))
        + ' variantDims=' + JSON.stringify(variantDims)
        + ' variantVoxelCount=' + variantVoxels
        + ' err=' + (err && err.message ? err.message : err));
      return (prefab && prefab.name ? prefab.name : '未知 prefab') + ' (' + variantDims + ' · 代理=' + normalizedCountText(variantVoxels, deps) + ')';
    }
  }
  function refreshPrefabSelectOptions(reason, deps) {
    deps = depsOrEmpty(deps);
    var ui = (typeof deps.getUi === 'function') ? deps.getUi() : null;
    if (!ui || !ui.prefabSelect) {
      log(deps, '[prefab-select] refresh-skip missing-select');
      return false;
    }
    var requestId = ++prefabSelectRefreshSeq;
    var source = getPrefabSelectRefreshSource(reason);
    var editorIndex = (typeof deps.getEditorPrototypeIndex === 'function') ? deps.getEditorPrototypeIndex() : 0;
    var prototypes = getPrototypes(deps);
    var state = computePrefabSelectSignature(editorIndex, deps);
    logPrefabSelectRequest(source, requestId, state, deps);
    if (prefabSelectRefreshGuard.active) {
      prefabSelectRefreshGuard.reentrantBlockCount += 1;
      logPrefabSelectSkip('reentrant', requestId, source, {
        activeRequestId: prefabSelectRefreshGuard.activeRequestId,
        activeSource: prefabSelectRefreshGuard.activeSource,
        count: prefabSelectRefreshGuard.reentrantBlockCount,
        signature: state.signature,
        selectedIndex: state.selectedIndex,
        optionCount: ui.prefabSelect.options ? ui.prefabSelect.options.length : 0,
        selectedPrefabId: state.selectedPrefabId
      }, deps);
      return false;
    }
    if (prefabSelectRefreshGuard.lastSignature === state.signature
        && ui.prefabSelect.options
        && ui.prefabSelect.options.length === state.optionCount
        && String(ui.prefabSelect.value || '') === String(state.selectedIndex)) {
      logPrefabSelectSkip('same-signature', requestId, source, {
        signature: state.signature,
        count: prefabSelectRefreshGuard.sameSignatureSkipCount + 1,
        selectedIndex: state.selectedIndex,
        optionCount: ui.prefabSelect.options.length,
        selectedPrefabId: state.selectedPrefabId
      }, deps);
      return false;
    }
    prefabSelectRefreshGuard.active = true;
    prefabSelectRefreshGuard.activeRequestId = requestId;
    prefabSelectRefreshGuard.activeSource = source;
    prefabSelectRefreshGuard.sameSignatureSkipCount = 0;
    var beforeValue = String(ui.prefabSelect.value || '');
    log(deps, '[prefab-select] refresh-start requestId=' + requestId
      + ' source=' + JSON.stringify(source)
      + ' prototypeCount=' + prototypes.length
      + ' signature=' + JSON.stringify(state.signature)
      + ' beforeValue=' + JSON.stringify(beforeValue));
    try {
      ui.prefabSelect.innerHTML = '';
      prototypes.forEach(function (prefab, idx) {
        try {
          var variant = typeof deps.prefabVariant === 'function' ? deps.prefabVariant(prefab, 0) : null;
          var doc = deps.document || global.document;
          var opt = doc.createElement('option');
          opt.value = String(idx);
          opt.textContent = buildPrefabSelectText(prefab, variant, idx, requestId, deps);
          ui.prefabSelect.appendChild(opt);
        } catch (err) {
          log(deps, '[prefab-select] refresh-item-error requestId=' + requestId
            + ' idx=' + idx
            + ' prefabId=' + JSON.stringify(prefab && prefab.id || 'unknown')
            + ' source=' + JSON.stringify(source)
            + ' err=' + (err && err.message ? err.message : err));
          var fallbackDoc = deps.document || global.document;
          var fallbackOpt = fallbackDoc.createElement('option');
          fallbackOpt.value = String(idx);
          fallbackOpt.textContent = (prefab && prefab.name ? prefab.name : '未知 prefab') + ' [option-error]';
          ui.prefabSelect.appendChild(fallbackOpt);
        }
      });
      ui.prefabSelect.value = String(state.selectedIndex);
      prefabSelectRefreshGuard.lastSignature = state.signature;
      prefabSelectRefreshGuard.lastSelectedPrefabId = state.selectedPrefabId;
      log(deps, '[prefab-select] refresh-done requestId=' + requestId
        + ' source=' + JSON.stringify(source)
        + ' optionCount=' + ui.prefabSelect.options.length
        + ' selectedIndex=' + state.selectedIndex
        + ' selectedPrefabId=' + JSON.stringify(state.selectedPrefabId)
        + ' afterValue=' + JSON.stringify(String(ui.prefabSelect.value || '')));
      return true;
    } finally {
      prefabSelectRefreshGuard.active = false;
      prefabSelectRefreshGuard.activeRequestId = 0;
      prefabSelectRefreshGuard.activeSource = '';
    }
  }

  global.__PREFAB_SELECT_REFRESH__ = {
    owner: OWNER,
    normalizedCountText: normalizedCountText,
    buildPrefabSelectText: buildPrefabSelectText,
    refreshPrefabSelectOptions: refreshPrefabSelectOptions
  };
})(typeof window !== 'undefined' ? window : globalThis);
