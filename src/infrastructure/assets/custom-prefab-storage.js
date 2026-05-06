// P11d-3: Custom prefab storage owner.
// Owns custom prefab list/save/load localStorage persistence.
(function installCustomPrefabStorage(global) {
  'use strict';

  var OWNER = 'src/infrastructure/assets/custom-prefab-storage.js';

function listCustomPrefabs() {
  return prototypes.filter(function (p) { return !!p.custom && !p.assetManaged; }).map(prefabToSerializable);
}

function saveCustomPrefabsToLocalStorage() {
  if (!sceneStorageAvailable()) return false;
  try {
    window.localStorage.setItem(LOCAL_PREFAB_STORAGE_KEY, JSON.stringify(listCustomPrefabs()));
    detailLog('prefab-storage: saved custom prefabs');
    return true;
  } catch (err) {
    pushLog('prefab-storage:error ' + (err && err.message ? err.message : err));
    return false;
  }
}

function loadCustomPrefabsFromLocalStorage() {
  if (!sceneStorageAvailable()) return false;
  try {
    var raw = window.localStorage.getItem(LOCAL_PREFAB_STORAGE_KEY);
    if (!raw) return false;
    var defs = JSON.parse(raw);
    if (!Array.isArray(defs)) return false;
    defs.forEach(function (def) { importPrefabDefinition(def, { persist: false, source: 'localStorage' }); });
    scheduleLegacyHabboRepairs('localStorage-prefabs');
    pushLog('prefab-storage: loaded ' + defs.length + ' custom prefabs');
    return defs.length > 0;
  } catch (err) {
    pushLog('prefab-storage:error ' + (err && err.message ? err.message : err));
    return false;
  }
}

  global.__CUSTOM_PREFAB_STORAGE__ = {
    owner: OWNER,
    listCustomPrefabs: listCustomPrefabs,
    saveCustomPrefabsToLocalStorage: saveCustomPrefabsToLocalStorage,
    loadCustomPrefabsFromLocalStorage: loadCustomPrefabsFromLocalStorage
  };
})(typeof window !== 'undefined' ? window : globalThis);
