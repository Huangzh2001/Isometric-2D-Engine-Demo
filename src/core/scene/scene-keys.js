// scene-keys.js
// Step-01: 从 lighting.js 中迁出场景存储 key / API 常量，保持全局兼容。

var SCENE_STORAGE_KEYS_OWNER = 'src/core/scene/scene-keys.js';

var LOCAL_SCENE_STORAGE_KEY = 'isometric-room-scene-v1';
var LOCAL_PREFAB_STORAGE_KEY = 'isometric-room-prefabs-v1';
var LOCAL_SCENE_CURRENT_FILE_KEY = 'isometric-room-scene-current-file-v1';
var SCENE_API_SAVE_URL = '/api/scenes/save';
var SCENE_API_LOAD_URL = '/api/scenes/load';
var SCENE_API_DEFAULT_URL = '/api/scenes/default';
var currentSceneServerFile = '';

window.__SCENE_STORAGE_KEYS = {
  owner: SCENE_STORAGE_KEYS_OWNER,
  LOCAL_SCENE_STORAGE_KEY: LOCAL_SCENE_STORAGE_KEY,
  LOCAL_PREFAB_STORAGE_KEY: LOCAL_PREFAB_STORAGE_KEY,
  LOCAL_SCENE_CURRENT_FILE_KEY: LOCAL_SCENE_CURRENT_FILE_KEY,
  SCENE_API_SAVE_URL: SCENE_API_SAVE_URL,
  SCENE_API_LOAD_URL: SCENE_API_LOAD_URL,
  SCENE_API_DEFAULT_URL: SCENE_API_DEFAULT_URL,
  getCurrentSceneServerFile: function () { return currentSceneServerFile; },
  setCurrentSceneServerFile: function (value) {
    currentSceneServerFile = value ? String(value) : '';
    return currentSceneServerFile;
  },
};
