// P11d-7: Habbo placement import service owner.
// Owns Habbo library item -> prefab placement import handoff.
(function installHabboPlacementImportService(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/habbo-placement-import-service.js';

  function safeDeps(deps) { return deps || {}; }
  function call(deps, name) {
    var args = Array.prototype.slice.call(arguments, 2);
    var fn = deps && deps[name];
    if (typeof fn !== 'function') return undefined;
    return fn.apply(null, args);
  }
  function setImportStatus(deps, message) {
    if (typeof deps.setHabboImportStatus === 'function') deps.setHabboImportStatus(message);
  }

  async function loadHabboLibraryItemToPlacement(item, options, deps) {
    deps = safeDeps(deps);
    options = options || {};
    var target = item || call(deps, 'getSelectedHabboLibraryItem');
    if (!target) throw new Error('当前没有可加载的 Habbo 资源');

    var makePrefabId = deps.makeHabboPrefabIdFromRelativePath;
    var prefabId = String(target.prefabId || (typeof makePrefabId === 'function' ? makePrefabId(target.swfRelativePath) : ''));
    var importSource = String(options.source || ('habbo-root:' + String(target.swfRelativePath || '')));
    var existing = call(deps, 'findPrefabByIdExact', prefabId);

    if (existing && !existing.missingPrefab) {
      call(deps, 'dedupeImportedPrefab', prefabId, { source: importSource, sourceKind: 'habbo-root' });
      call(deps, 'pushLog', '[asset-import] import-prefab:dedupe-hit id=' + prefabId + ' kind=existing-prefab strategy=refresh-existing-selection source=' + importSource);
      call(deps, 'prepareImportedPrefabForPlacement', existing, {
        source: 'habbo-library:reuse-existing',
        refreshSource: 'asset-import:habbo-library-reuse',
      });
      setImportStatus(deps, '已从资源库选择：' + (existing.name || target.displayName) + '，已切换到放置模式。');
      return { prefab: existing, reused: true };
    }

    var buffer;
    try {
      buffer = await call(deps, 'fetchHabboAssetFileBuffer', target.swfRelativePath);
    } catch (err) {
      var missingMessage = '未找到对应的 SWF 文件：' + String(target.swfRelativePath || '');
      call(deps, 'alert', missingMessage);
      throw new Error(missingMessage);
    }

    var basename = deps.basenameFromPath;
    var displayName = String(target.displayName || target.classname || (typeof deps.makeHabboDisplayNameFromRelativePath === 'function' ? deps.makeHabboDisplayNameFromRelativePath(target.swfRelativePath) : target.swfRelativePath || ''));
    var result = await call(deps, 'importHabboSwfToSceneFromBuffer', buffer, {
      assetName: typeof basename === 'function' ? basename(target.swfRelativePath) : String(target.swfRelativePath || ''),
      relativePath: target.swfRelativePath,
      displayName: displayName,
      prefabId: prefabId,
      select: true,
      prepareForPlacement: true,
      sourceKind: 'habbo-root',
      source: importSource,
    });
    setImportStatus(deps, '资源库已加载：' + (result && result.prefab && result.prefab.name ? result.prefab.name : target.displayName) + '，现在可以直接在场景中点击放置。');
    return result;
  }

  global.__HABBO_PLACEMENT_IMPORT_SERVICE__ = {
    owner: OWNER,
    loadHabboLibraryItemToPlacement: loadHabboLibraryItemToPlacement
  };
})(typeof window !== 'undefined' ? window : globalThis);
